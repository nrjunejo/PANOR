import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, patientsTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { email, password } = body.data;
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user[0] || user[0].password !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const u = user[0];
  let medicalId: string | null = null;
  if (u.role === "patient") {
    const pat = await db.select({ medicalId: patientsTable.medicalId }).from(patientsTable).where(eq(patientsTable.userId, u.id)).limit(1);
    medicalId = pat[0]?.medicalId ?? null;
  }
  const token = Buffer.from(JSON.stringify({ id: u.id, email: u.email, role: u.role })).toString("base64");
  res.json({
    token,
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      specialization: u.specialization,
      medicalId,
    },
  });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), "base64").toString());
    const user = await db.select().from(usersTable).where(eq(usersTable.id, payload.id)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const u = user[0];
    let medicalId: string | null = null;
    if (u.role === "patient") {
      const pat = await db.select({ medicalId: patientsTable.medicalId }).from(patientsTable).where(eq(patientsTable.userId, u.id)).limit(1);
      medicalId = pat[0]?.medicalId ?? null;
    }
    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      specialization: u.specialization,
      medicalId,
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
