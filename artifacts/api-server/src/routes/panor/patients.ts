import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, visitsTable, prescriptionsTable, alertsTable, timelineEventsTable } from "@workspace/db";
import { CreatePatientBody, ListPatientsQueryParams } from "@workspace/api-zod";
import { eq, like, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/patients", async (req, res) => {
  const query = ListPatientsQueryParams.safeParse(req.query);
  const search = query.success ? (query.data.search ?? "") : "";
  const limit = query.success ? (query.data.limit ?? 50) : 50;
  const offset = query.success ? (query.data.offset ?? 0) : 0;

  let patients;
  if (search) {
    patients = await db.select().from(patientsTable)
      .where(like(patientsTable.name, `%${search}%`))
      .limit(limit).offset(offset).orderBy(desc(patientsTable.createdAt));
  } else {
    patients = await db.select().from(patientsTable)
      .limit(limit).offset(offset).orderBy(desc(patientsTable.createdAt));
  }
  const total = await db.select({ count: sql<number>`count(*)` }).from(patientsTable);
  res.json({ patients, total: Number(total[0]?.count ?? 0) });
});

router.post("/patients", async (req, res) => {
  const body = CreatePatientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: body.error.issues });
    return;
  }
  const medicalId = "MED-" + Date.now().toString(36).toUpperCase();
  const [patient] = await db.insert(patientsTable).values({
    ...body.data,
    medicalId,
  }).returning();
  res.status(201).json(patient);
});

router.get("/patients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
  if (!patient) { res.status(404).json({ error: "Not found" }); return; }

  const visits = await db.select().from(visitsTable).where(eq(visitsTable.patientId, id)).orderBy(desc(visitsTable.createdAt)).limit(1);
  const lastVisit = visits[0]?.createdAt?.toISOString() ?? null;
  const totalVisitsResult = await db.select({ count: sql<number>`count(*)` }).from(visitsTable).where(eq(visitsTable.patientId, id));
  const totalVisits = Number(totalVisitsResult[0]?.count ?? 0);

  const riskLabel = (patient.riskScore ?? 0) >= 70 ? "High" : (patient.riskScore ?? 0) >= 40 ? "Medium" : "Low";

  res.json({
    ...patient,
    lastVisit,
    totalVisits,
    riskLabel,
  });
});

router.get("/patients/:id/timeline", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const events = await db.select().from(timelineEventsTable)
    .where(eq(timelineEventsTable.patientId, id))
    .orderBy(desc(timelineEventsTable.eventDate));
  res.json({
    events: events.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      date: e.eventDate?.toISOString(),
      severity: e.severity,
    })),
  });
});

router.get("/patients/:id/medications", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const meds = await db.select().from(prescriptionsTable)
    .where(eq(prescriptionsTable.patientId, id))
    .orderBy(desc(prescriptionsTable.prescribedAt));
  res.json({
    medications: meds.map(m => ({
      id: m.id,
      name: m.medication,
      dosage: m.dosage,
      frequency: m.frequency,
      prescribedBy: "Dr. (on record)",
      prescribedAt: m.prescribedAt?.toISOString(),
      active: m.active,
    })),
  });
});

export default router;
