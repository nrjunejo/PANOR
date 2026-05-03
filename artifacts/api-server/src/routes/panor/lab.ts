import { Router } from "express";
import { db } from "@workspace/db";
import { labOrdersTable, patientsTable, timelineEventsTable } from "@workspace/db";
import { CreateLabOrderBody, UpdateLabOrderBody, ListLabOrdersQueryParams } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

async function translateClinicalToLab(clinicalIntent: string, priority: string, patientContext?: string): Promise<{
  tests: Array<{ name: string; code: string; priority: string; instructions: string; rationale: string }>;
  aiExplanation: string;
  totalEstimatedTime: string;
}> {
  const prompt = `You are a medical laboratory AI. Translate this clinical intent into specific lab tests.
Clinical intent: "${clinicalIntent}"
Priority: ${priority}
${patientContext ? `Patient context: ${patientContext}` : ""}

Respond ONLY with valid JSON:
{
  "tests": [{"name": "Test Name", "code": "CODE", "priority": "${priority}", "instructions": "specific instructions", "rationale": "why this test"}],
  "aiExplanation": "brief explanation",
  "totalEstimatedTime": "e.g. 2-4 hours"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      tests: [{ name: "Complete Blood Count", code: "CBC", priority, instructions: "Standard collection", rationale: "Baseline assessment" }],
      aiExplanation: "Standard tests ordered based on clinical intent.",
      totalEstimatedTime: "2-4 hours",
    };
  }
}

router.get("/lab/orders", async (req, res) => {
  const q = ListLabOrdersQueryParams.safeParse(req.query);
  const { status, priority, patientId } = q.success ? q.data : req.query as any;
  let orders = await db.select().from(labOrdersTable).orderBy(desc(labOrdersTable.createdAt));
  if (status) orders = orders.filter(o => o.status === status);
  if (priority) orders = orders.filter(o => o.priority === priority);
  if (patientId) orders = orders.filter(o => o.patientId === Number(patientId));

  const enriched = await Promise.all(orders.map(async o => {
    const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, o.patientId)).limit(1);
    return { ...o, patientName: pat?.name ?? "Unknown", createdAt: o.createdAt?.toISOString() };
  }));

  const total = await db.select({ count: sql<number>`count(*)` }).from(labOrdersTable);
  res.json({ orders: enriched, total: Number(total[0]?.count ?? 0) });
});

router.post("/lab/orders", async (req, res) => {
  const body = CreateLabOrderBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const translated = await translateClinicalToLab(body.data.clinicalIntent, body.data.priority ?? "routine");
  const [order] = await db.insert(labOrdersTable).values({
    patientId: body.data.patientId,
    visitId: body.data.visitId ?? null,
    clinicalIntent: body.data.clinicalIntent,
    tests: translated.tests,
    priority: body.data.priority ?? "routine",
    status: "pending",
    aiTranslation: translated.aiExplanation,
  }).returning();

  await db.insert(timelineEventsTable).values({
    patientId: body.data.patientId,
    type: "lab_result",
    title: `Lab Order: ${translated.tests.length} test(s) ordered`,
    description: body.data.clinicalIntent,
    severity: body.data.priority === "stat" ? "critical" : body.data.priority === "urgent" ? "warning" : "info",
    eventDate: new Date(),
  });

  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, body.data.patientId)).limit(1);
  res.status(201).json({ ...order, patientName: pat?.name ?? "Unknown", createdAt: order.createdAt?.toISOString() });
});

router.patch("/lab/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = UpdateLabOrderBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [updated] = await db.update(labOrdersTable).set(body.data).where(eq(labOrdersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, updated.patientId)).limit(1);
  res.json({ ...updated, patientName: pat?.name ?? "Unknown", createdAt: updated.createdAt?.toISOString() });
});

export default router;
