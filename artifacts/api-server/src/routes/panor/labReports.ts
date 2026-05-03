import { Router } from "express";
import { db } from "@workspace/db";
import { labReportsTable, labOrdersTable, patientsTable, timelineEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

async function parseLabReportWithAI(fileData: string, fileName: string): Promise<{
  parsedValues: Array<{ test: string; value: string; unit: string; normalRange: string; status: string }>;
  interpretation: string;
  aiParsedData: Record<string, any>;
}> {
  const prompt = `You are a medical laboratory AI. A lab report has been uploaded (${fileName}).
${fileData.length > 500 ? "The report content (base64/text):" : "The raw text content:"}
${fileData.slice(0, 2000)}

Extract all lab test results. Respond ONLY with valid JSON:
{
  "parsedValues": [
    {"test": "Hemoglobin", "value": "12.5", "unit": "g/dL", "normalRange": "12-16", "status": "normal"},
    ...
  ],
  "interpretation": "Brief clinical interpretation",
  "aiParsedData": {"reportType": "CBC", "reportDate": "2026-05-03", "labName": "City Lab"}
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      parsedValues: [{ test: "Unable to parse", value: "-", unit: "-", normalRange: "-", status: "unknown" }],
      interpretation: "AI parsing failed. Please review manually.",
      aiParsedData: {},
    };
  }
}

router.get("/lab/reports", async (req, res) => {
  const { patientId, labOrderId } = req.query;
  let reports = await db.select().from(labReportsTable).orderBy(desc(labReportsTable.createdAt));
  if (patientId) reports = reports.filter(r => r.patientId === Number(patientId));
  if (labOrderId) reports = reports.filter(r => r.labOrderId === Number(labOrderId));

  const enriched = await Promise.all(reports.map(async r => {
    const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, r.patientId)).limit(1);
    return { ...r, patientName: pat?.name ?? "Unknown", createdAt: r.createdAt?.toISOString(), fileData: undefined };
  }));

  res.json({ reports: enriched, total: reports.length });
});

router.post("/lab/reports", async (req, res) => {
  const { labOrderId, patientId, fileName, fileType, fileData, uploadedBy } = req.body;
  if (!patientId || !fileName || !fileType) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const parsed = await parseLabReportWithAI(fileData ?? fileName, fileName);

  const [report] = await db.insert(labReportsTable).values({
    labOrderId: labOrderId ?? null,
    patientId,
    uploadedBy: uploadedBy ?? null,
    fileName,
    fileType,
    fileData: fileData?.slice(0, 50000) ?? null,
    aiParsedData: parsed.aiParsedData,
    parsedValues: parsed.parsedValues,
    interpretation: parsed.interpretation,
  }).returning();

  if (labOrderId) {
    await db.update(labOrdersTable).set({ status: "completed", completedAt: new Date() }).where(eq(labOrdersTable.id, labOrderId));
  }

  await db.insert(timelineEventsTable).values({
    patientId,
    type: "lab_result",
    title: `Lab Report Uploaded: ${fileName}`,
    description: parsed.interpretation,
    severity: "info",
    referenceId: report.id,
    referenceType: "lab_report",
    eventDate: new Date(),
  });

  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, patientId)).limit(1);
  res.status(201).json({ ...report, patientName: pat?.name ?? "Unknown", createdAt: report.createdAt?.toISOString(), fileData: undefined });
});

router.get("/lab/reports/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [report] = await db.select().from(labReportsTable).where(eq(labReportsTable.id, id));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, report.patientId)).limit(1);
  res.json({ ...report, patientName: pat?.name ?? "Unknown", createdAt: report.createdAt?.toISOString() });
});

export default router;
