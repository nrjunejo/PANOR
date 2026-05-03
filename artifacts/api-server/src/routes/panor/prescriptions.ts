import { Router } from "express";
import { db } from "@workspace/db";
import { prescriptionsTable, patientsTable, alertsTable, timelineEventsTable } from "@workspace/db";
import { CreatePrescriptionBody, CheckDrugInteractionBody, ListPrescriptionsQueryParams } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

async function checkDrugInteractionsAI(newMed: string, currentMeds: string[]): Promise<{
  safe: boolean; status: string; interactions: Array<{ drug: string; severity: string; explanation: string; suggestion?: string }>; confidenceScore: number; recommendation: string;
}> {
  if (currentMeds.length === 0) {
    return { safe: true, status: "safe", interactions: [], confidenceScore: 0.97, recommendation: `${newMed} is safe to prescribe. No current medications on record.` };
  }

  const prompt = `You are a clinical pharmacist AI. Analyze drug interactions.
New medication: ${newMed}
Current medications: ${currentMeds.join(", ")}

Respond ONLY with valid JSON in this exact format:
{
  "safe": boolean,
  "status": "safe" | "warning" | "blocked",
  "interactions": [{"drug": "name", "severity": "mild|moderate|severe", "explanation": "why", "suggestion": "alternative if blocked"}],
  "confidenceScore": 0.0-1.0,
  "recommendation": "brief clinical recommendation"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { safe: true, status: "safe", interactions: [], confidenceScore: 0.5, recommendation: "Unable to perform AI check. Use clinical judgment." };
  }
}

router.get("/prescriptions", async (req, res) => {
  const q = ListPrescriptionsQueryParams.safeParse(req.query);
  const { visitId, patientId } = q.success ? q.data : req.query as any;
  let rxs = await db.select().from(prescriptionsTable).orderBy(desc(prescriptionsTable.prescribedAt));
  if (visitId) rxs = rxs.filter(r => r.visitId === Number(visitId));
  if (patientId) rxs = rxs.filter(r => r.patientId === Number(patientId));
  res.json({ prescriptions: rxs.map(r => ({ ...r, prescribedAt: r.prescribedAt?.toISOString() })) });
});

router.post("/prescriptions", async (req, res) => {
  const body = CreatePrescriptionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const currentMeds = await db.select().from(prescriptionsTable)
    .where(eq(prescriptionsTable.patientId, body.data.patientId));
  const currentMedNames = currentMeds.filter(m => m.active).map(m => m.medication);

  const safetyCheck = await checkDrugInteractionsAI(body.data.medication, currentMedNames);

  const [rx] = await db.insert(prescriptionsTable).values({
    ...body.data,
    safetyStatus: safetyCheck.status,
    interactionWarning: safetyCheck.status !== "safe" ? safetyCheck.recommendation : null,
    active: safetyCheck.status !== "blocked",
  }).returning();

  if (safetyCheck.status === "blocked" || safetyCheck.status === "warning") {
    await db.insert(alertsTable).values({
      patientId: body.data.patientId,
      type: "drug_interaction",
      title: safetyCheck.status === "blocked" ? "Dangerous Drug Interaction Blocked" : "Drug Interaction Warning",
      message: safetyCheck.recommendation,
      severity: safetyCheck.status === "blocked" ? "critical" : "warning",
    });
  }

  await db.insert(timelineEventsTable).values({
    patientId: body.data.patientId,
    type: "prescription",
    title: `Prescribed: ${body.data.medication}`,
    description: `${body.data.dosage} - ${body.data.frequency} for ${body.data.duration}`,
    severity: safetyCheck.status === "blocked" ? "critical" : safetyCheck.status === "warning" ? "warning" : "info",
    eventDate: new Date(),
  });

  res.status(201).json({ prescription: { ...rx, prescribedAt: rx.prescribedAt?.toISOString() }, safetyCheck });
});

router.post("/prescriptions/drug-check", async (req, res) => {
  const body = CheckDrugInteractionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const currentMeds = body.data.currentMedications ?? [];
  if (currentMeds.length === 0) {
    const dbMeds = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, body.data.patientId));
    dbMeds.filter(m => m.active).forEach(m => currentMeds.push(m.medication));
  }

  const result = await checkDrugInteractionsAI(body.data.newMedication, currentMeds);
  res.json(result);
});

export default router;
