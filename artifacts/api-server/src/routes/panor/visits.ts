import { Router } from "express";
import { db } from "@workspace/db";
import { visitsTable, patientsTable, usersTable, timelineEventsTable } from "@workspace/db";
import { CreateVisitBody, UpdateVisitBody, ListVisitsQueryParams } from "@workspace/api-zod";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

async function enrichVisit(v: typeof visitsTable.$inferSelect) {
  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, v.patientId)).limit(1);
  const [doc] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, v.doctorId)).limit(1);
  return {
    ...v,
    patientName: pat?.name ?? "Unknown",
    doctorName: doc?.name ?? "Unknown",
    createdAt: v.createdAt?.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  };
}

router.get("/visits", async (req, res) => {
  const query = ListVisitsQueryParams.safeParse(req.query);
  const { patientId, doctorId, status, limit = 20 } = query.success ? query.data : req.query as any;

  let visits = await db.select().from(visitsTable).orderBy(desc(visitsTable.createdAt)).limit(Number(limit));
  if (patientId) visits = visits.filter(v => v.patientId === Number(patientId));
  if (doctorId) visits = visits.filter(v => v.doctorId === Number(doctorId));
  if (status) visits = visits.filter(v => v.status === status);

  const enriched = await Promise.all(visits.map(enrichVisit));
  const total = await db.select({ count: sql<number>`count(*)` }).from(visitsTable);
  res.json({ visits: enriched, total: Number(total[0]?.count ?? 0) });
});

router.post("/visits", async (req, res) => {
  const body = CreateVisitBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [visit] = await db.insert(visitsTable).values({
    ...body.data,
    status: "active",
    updatedAt: new Date(),
  }).returning();

  await db.insert(timelineEventsTable).values({
    patientId: visit.patientId,
    type: "visit",
    title: "New Visit Started",
    description: body.data.chiefComplaint,
    severity: "info",
    eventDate: new Date(),
  });

  const enriched = await enrichVisit(visit);
  res.status(201).json(enriched);
});

router.get("/visits/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [visit] = await db.select().from(visitsTable).where(eq(visitsTable.id, id));
  if (!visit) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichVisit(visit));
});

router.patch("/visits/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = UpdateVisitBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [updated] = await db.update(visitsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(visitsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  if (body.data.diagnosis) {
    await db.insert(timelineEventsTable).values({
      patientId: updated.patientId,
      type: "visit",
      title: "Diagnosis Updated",
      description: body.data.diagnosis,
      severity: "info",
      eventDate: new Date(),
    });
  }

  res.json(await enrichVisit(updated));
});

export default router;
