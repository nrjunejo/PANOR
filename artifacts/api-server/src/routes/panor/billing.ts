import { Router } from "express";
import { db } from "@workspace/db";
import { billsTable, patientsTable } from "@workspace/db";
import { CreateBillBody, ListBillsQueryParams } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

async function enrichBill(b: typeof billsTable.$inferSelect) {
  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, b.patientId)).limit(1);
  const items = (b.items as Array<{ description: string; amount: number; category: string }>) ?? [];
  const aiSummary = items.map(i => i.description).join(" + ");
  return {
    ...b,
    patientName: pat?.name ?? "Unknown",
    total: parseFloat(String(b.total ?? 0)),
    items,
    aiSummary: aiSummary || b.aiSummary,
    createdAt: b.createdAt?.toISOString(),
    paidAt: b.paidAt?.toISOString() ?? null,
  };
}

router.get("/billing", async (req, res) => {
  const q = ListBillsQueryParams.safeParse(req.query);
  const { patientId, status } = q.success ? q.data : req.query as any;
  let bills = await db.select().from(billsTable).orderBy(desc(billsTable.createdAt));
  if (patientId) bills = bills.filter(b => b.patientId === Number(patientId));
  if (status) bills = bills.filter(b => b.status === status);
  const enriched = await Promise.all(bills.map(enrichBill));
  const total = await db.select({ count: sql<number>`count(*)` }).from(billsTable);
  res.json({ bills: enriched, total: Number(total[0]?.count ?? 0) });
});

router.post("/billing", async (req, res) => {
  const body = CreateBillBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const items = body.data.items ?? [];
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const aiSummary = items.map(i => i.description).join(" + ");

  const [bill] = await db.insert(billsTable).values({
    patientId: body.data.patientId,
    visitId: body.data.visitId ?? null,
    items,
    total: String(total),
    status: "pending",
    aiSummary,
  }).returning();

  res.status(201).json(await enrichBill(bill));
});

router.post("/billing/:id/pay", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(billsTable).set({ status: "paid", paidAt: new Date() }).where(eq(billsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichBill(updated));
});

export default router;
