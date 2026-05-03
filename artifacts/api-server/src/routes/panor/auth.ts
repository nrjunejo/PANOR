import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, patientsTable, otpCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function makeToken(id: number, email: string, role: string): string {
  return Buffer.from(JSON.stringify({ id, email, role })).toString("base64");
}

async function getUserFromToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

router.post("/auth/send-otp", async (req, res) => {
  const { email, purpose = "signup" } = req.body;
  if (!email) { res.status(400).json({ error: "Email required" }); return; }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(otpCodesTable).values({ email, code, purpose, expiresAt });

  req.log.info({ email, purpose }, "OTP generated");
  res.json({ message: "OTP sent", demoOtp: code });
});

router.post("/auth/signup", async (req, res) => {
  const { name, email, phone, role, password, otp } = req.body;
  if (!name || !email || !password || !otp) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const otpRecord = await db.select().from(otpCodesTable)
    .where(eq(otpCodesTable.email, email))
    .orderBy(otpCodesTable.createdAt)
    .limit(1);

  const latest = otpRecord[otpRecord.length - 1] ?? otpRecord[0];
  if (!latest || latest.used || latest.code !== String(otp) || new Date() > latest.expiresAt) {
    res.status(400).json({ error: "Invalid or expired OTP" }); return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) { res.status(409).json({ error: "Email already registered" }); return; }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, latest.id));

  const [user] = await db.insert(usersTable).values({
    email, password, name, role: role ?? "patient",
    phone, isVerified: true,
  }).returning();

  if (user.role === "patient") {
    const medicalId = "MED-" + Date.now().toString(36).toUpperCase();
    await db.insert(patientsTable).values({
      userId: user.id,
      medicalId,
      name: user.name,
      dateOfBirth: "2000-01-01",
      gender: "Unknown",
      phone: phone ?? "0000-0000000",
      socialWelfareScore: 0,
    });
  }

  const token = makeToken(user.id, user.email, user.role);
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }

  let medicalId: string | null = null;
  let patientDbId: number | null = null;
  if (user.role === "patient") {
    const pat = await db.select({ medicalId: patientsTable.medicalId, id: patientsTable.id })
      .from(patientsTable).where(eq(patientsTable.userId, user.id)).limit(1);
    medicalId = pat[0]?.medicalId ?? null;
    patientDbId = pat[0]?.id ?? null;
  }

  const token = makeToken(user.id, user.email, user.role);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, specialization: user.specialization, medicalId, patientDbId },
  });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUserFromToken(authHeader.slice(7));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  let medicalId: string | null = null;
  let patientDbId: number | null = null;
  if (user.role === "patient") {
    const pat = await db.select({ medicalId: patientsTable.medicalId, id: patientsTable.id })
      .from(patientsTable).where(eq(patientsTable.userId, user.id)).limit(1);
    medicalId = pat[0]?.medicalId ?? null;
    patientDbId = pat[0]?.id ?? null;
  }

  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, specialization: user.specialization, medicalId, patientDbId });
});

export default router;
