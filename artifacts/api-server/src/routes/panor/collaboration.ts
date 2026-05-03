import { Router } from "express";
import { db } from "@workspace/db";
import { doctorCollaborationsTable, collaborationMessagesTable, usersTable, patientsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/doctor/collaborations", async (req, res) => {
  const { doctorId, patientId } = req.query;
  let collabs = await db.select().from(doctorCollaborationsTable).orderBy(desc(doctorCollaborationsTable.createdAt));
  if (doctorId) collabs = collabs.filter(c => c.initiatorId === Number(doctorId) || c.consultantId === Number(doctorId));
  if (patientId) collabs = collabs.filter(c => c.patientId === Number(patientId));

  const enriched = await Promise.all(collabs.map(async c => {
    const [initiator] = await db.select({ name: usersTable.name, spec: usersTable.specialization }).from(usersTable).where(eq(usersTable.id, c.initiatorId)).limit(1);
    const [consultant] = await db.select({ name: usersTable.name, spec: usersTable.specialization }).from(usersTable).where(eq(usersTable.id, c.consultantId)).limit(1);
    const [patient] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, c.patientId)).limit(1);
    const msgCount = await db.select().from(collaborationMessagesTable).where(eq(collaborationMessagesTable.collaborationId, c.id));
    return {
      ...c,
      initiatorName: initiator?.name ?? "Unknown",
      consultantName: consultant?.name ?? "Unknown",
      consultantSpec: consultant?.spec ?? "",
      patientName: patient?.name ?? "Unknown",
      messageCount: msgCount.length,
      createdAt: c.createdAt?.toISOString(),
    };
  }));
  res.json({ collaborations: enriched });
});

router.post("/doctor/collaborations", async (req, res) => {
  const { initiatorId, consultantId, patientId, visitId, subject, initialMessage } = req.body;
  if (!initiatorId || !consultantId || !patientId || !subject) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const [collab] = await db.insert(doctorCollaborationsTable).values({
    initiatorId, consultantId, patientId, visitId: visitId ?? null, subject,
  }).returning();

  if (initialMessage) {
    await db.insert(collaborationMessagesTable).values({
      collaborationId: collab.id, senderId: initiatorId, message: initialMessage,
    });
  }
  res.status(201).json({ ...collab, createdAt: collab.createdAt?.toISOString() });
});

router.get("/doctor/collaborations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const messages = await db.select().from(collaborationMessagesTable)
    .where(eq(collaborationMessagesTable.collaborationId, id))
    .orderBy(collaborationMessagesTable.createdAt);
  const enriched = await Promise.all(messages.map(async m => {
    const [sender] = await db.select({ name: usersTable.name, role: usersTable.role, spec: usersTable.specialization })
      .from(usersTable).where(eq(usersTable.id, m.senderId)).limit(1);
    return { ...m, senderName: sender?.name ?? "Unknown", senderRole: sender?.role ?? "", senderSpec: sender?.spec, createdAt: m.createdAt?.toISOString() };
  }));
  res.json({ messages: enriched });
});

router.post("/doctor/collaborations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { senderId, message } = req.body;
  if (!senderId || !message) { res.status(400).json({ error: "Missing fields" }); return; }
  const [msg] = await db.insert(collaborationMessagesTable).values({
    collaborationId: id, senderId, message,
  }).returning();
  const [sender] = await db.select({ name: usersTable.name, role: usersTable.role, spec: usersTable.specialization })
    .from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
  res.status(201).json({ ...msg, senderName: sender?.name ?? "Unknown", createdAt: msg.createdAt?.toISOString() });
});

router.patch("/doctor/collaborations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, resolution } = req.body;
  const [updated] = await db.update(doctorCollaborationsTable).set({ status, resolution: resolution ?? null }).where(eq(doctorCollaborationsTable.id, id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt?.toISOString() });
});

export default router;
