import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, appointmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/doctors", async (req, res) => {
  const { specialty, available } = req.query;
  let doctors = await db.select().from(usersTable).where(eq(usersTable.role, "doctor"));
  if (specialty) {
    doctors = doctors.filter(d => d.specialization?.toLowerCase().includes((specialty as string).toLowerCase()));
  }
  if (available === "true") {
    doctors = doctors.filter(d => d.availableToday);
  }
  res.json({
    doctors: doctors.map(d => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization ?? "General Medicine",
      qualifications: d.qualifications ?? "MBBS, FCPS",
      rating: parseFloat(String(d.rating ?? "4.5")),
      availableToday: d.availableToday ?? true,
      nextAvailable: new Date().toISOString(),
    })),
  });
});

router.get("/doctors/:id/schedule", async (req, res) => {
  const doctorId = parseInt(req.params.id);
  if (isNaN(doctorId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const todayAppts = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.doctorId, doctorId), eq(appointmentsTable.status, "scheduled")));

  const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const bookedTimes = todayAppts.map(a => {
    try { return new Date(a.datetime).toTimeString().slice(0, 5); } catch { return ""; }
  });

  const slots = times.map(time => ({
    time,
    available: !bookedTimes.includes(time),
    appointmentId: todayAppts.find(a => {
      try { return new Date(a.datetime).toTimeString().slice(0, 5) === time; } catch { return false; }
    })?.id ?? null,
  }));

  res.json({ doctorId, date, slots });
});

router.patch("/doctors/:id/schedule/slots", async (req, res) => {
  const doctorId = parseInt(req.params.id);
  const { date, slots } = req.body;
  res.json({ doctorId, date: date || new Date().toISOString().split("T")[0], slots: slots || [] });
});

export default router;
