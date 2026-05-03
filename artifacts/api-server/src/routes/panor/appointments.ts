import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, patientsTable, usersTable } from "@workspace/db";
import { CreateAppointmentBody, UpdateAppointmentBody, ListAppointmentsQueryParams } from "@workspace/api-zod";
import { eq, desc, sql, and } from "drizzle-orm";

const router = Router();

async function enrichAppointment(a: typeof appointmentsTable.$inferSelect) {
  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, a.patientId)).limit(1);
  const [doc] = await db.select({ name: usersTable.name, specialization: usersTable.specialization }).from(usersTable).where(eq(usersTable.id, a.doctorId)).limit(1);
  return {
    ...a,
    patientName: pat?.name ?? "Unknown",
    doctorName: doc?.name ?? "Unknown",
    specialty: doc?.specialization ?? a.specialty,
    createdAt: a.createdAt?.toISOString(),
  };
}

router.get("/appointments", async (req, res) => {
  const q = ListAppointmentsQueryParams.safeParse(req.query);
  const { patientId, doctorId, status, date } = q.success ? q.data : req.query as any;

  let appts = await db.select().from(appointmentsTable).orderBy(desc(appointmentsTable.createdAt));
  if (patientId) appts = appts.filter(a => a.patientId === Number(patientId));
  if (doctorId) appts = appts.filter(a => a.doctorId === Number(doctorId));
  if (status) appts = appts.filter(a => a.status === status);
  if (date) appts = appts.filter(a => a.datetime.startsWith(date as string));

  const enriched = await Promise.all(appts.map(enrichAppointment));
  const total = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable);
  res.json({ appointments: enriched, total: Number(total[0]?.count ?? 0) });
});

router.post("/appointments", async (req, res) => {
  const body = CreateAppointmentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [appt] = await db.insert(appointmentsTable).values({
    patientId: body.data.patientId,
    doctorId: body.data.doctorId,
    specialty: body.data.specialty,
    datetime: body.data.datetime,
    duration: 30,
    status: "scheduled",
    priority: body.data.priority ?? "normal",
    aiSuggested: false,
    notes: body.data.notes,
    symptoms: body.data.symptoms,
  }).returning();

  res.status(201).json(await enrichAppointment(appt));
});

router.patch("/appointments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = UpdateAppointmentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const updateData: Partial<typeof appointmentsTable.$inferInsert> = {};
  if (body.data.status) updateData.status = body.data.status;
  if (body.data.datetime) updateData.datetime = body.data.datetime;
  if (body.data.notes) updateData.notes = body.data.notes;

  const [updated] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichAppointment(updated));
});

export default router;
