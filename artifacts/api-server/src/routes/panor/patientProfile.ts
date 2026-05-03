import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, patientHealthHistoryTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// NADRA lookup (mock)
router.post("/patient/nadra-lookup", async (req, res) => {
  const { cnic } = req.body;
  if (!cnic || cnic.length < 13) { res.status(400).json({ error: "Valid CNIC required (13 digits)" }); return; }

  // Mock NADRA response based on CNIC
  const mockData = {
    name: "Muhammad Ali Khan",
    dateOfBirth: "1985-03-15",
    gender: "Male",
    fatherName: "Abdul Rehman Khan",
    address: "House 12, Street 4, Gulshan-e-Iqbal, Karachi",
    city: "Karachi",
    district: "Karachi East",
    province: "Sindh",
    cnicNumber: cnic,
    isVerified: true,
  };
  await new Promise(r => setTimeout(r, 800));
  res.json({ ...mockData, source: "NADRA_VERISYS", verified: true });
});

// Get full patient profile
router.get("/patient/profile/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.userId, userId)).limit(1);
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const [history] = await db.select().from(patientHealthHistoryTable).where(eq(patientHealthHistoryTable.patientId, patient.id)).limit(1);
  res.json({ patient, healthHistory: history ?? null });
});

// Update patient profile
router.patch("/patient/profile/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.userId, userId)).limit(1);
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const { cnicNumber, address, city, district, province, emergencyContact, emergencyPhone, occupation, education, monthlyIncome, bloodGroup, allergies, nadraVerified } = req.body;
  const updateData: any = {};
  if (cnicNumber !== undefined) updateData.cnicNumber = cnicNumber;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (district !== undefined) updateData.district = district;
  if (province !== undefined) updateData.province = province;
  if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
  if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone;
  if (occupation !== undefined) updateData.occupation = occupation;
  if (education !== undefined) updateData.education = education;
  if (monthlyIncome !== undefined) updateData.monthlyIncome = String(monthlyIncome);
  if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
  if (allergies !== undefined) updateData.allergies = allergies;
  if (nadraVerified !== undefined) updateData.nadraVerified = nadraVerified;

  // Calculate social welfare score
  const income = parseFloat(String(monthlyIncome ?? patient.monthlyIncome ?? 0));
  let welfareScore = 0;
  if (income < 25000) welfareScore += 40;
  else if (income < 50000) welfareScore += 25;
  else if (income < 100000) welfareScore += 10;
  if (nadraVerified) welfareScore += 20;
  if (updateData.province === "Balochistan" || updateData.province === "KP") welfareScore += 15;
  updateData.socialWelfareScore = Math.min(100, welfareScore);
  updateData.welfareEligible = welfareScore >= 40;

  const [updated] = await db.update(patientsTable).set(updateData).where(eq(patientsTable.id, patient.id)).returning();
  res.json(updated);
});

// Save health history
router.post("/patient/health-history/:patientId", async (req, res) => {
  const patientId = parseInt(req.params.patientId);
  const { familyHistory, pastSurgeries, chronicConditions, vaccinations, smokingStatus, alcoholUse, exerciseFrequency, dietaryRestrictions, height, weight, bloodPressure } = req.body;

  const bmi = height && weight ? parseFloat(String(weight)) / Math.pow(parseFloat(String(height)) / 100, 2) : null;

  const existing = await db.select().from(patientHealthHistoryTable).where(eq(patientHealthHistoryTable.patientId, patientId)).limit(1);
  if (existing[0]) {
    const [updated] = await db.update(patientHealthHistoryTable).set({
      familyHistory: familyHistory ?? [], pastSurgeries: pastSurgeries ?? [], chronicConditions: chronicConditions ?? [],
      vaccinations: vaccinations ?? [], smokingStatus, alcoholUse, exerciseFrequency, dietaryRestrictions: dietaryRestrictions ?? [],
      height: height ? String(height) : null, weight: weight ? String(weight) : null, bmi: bmi ? String(bmi.toFixed(1)) : null, bloodPressure, updatedAt: new Date(),
    }).where(eq(patientHealthHistoryTable.id, existing[0].id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(patientHealthHistoryTable).values({
      patientId, familyHistory: familyHistory ?? [], pastSurgeries: pastSurgeries ?? [],
      chronicConditions: chronicConditions ?? [], vaccinations: vaccinations ?? [],
      smokingStatus, alcoholUse, exerciseFrequency, dietaryRestrictions: dietaryRestrictions ?? [],
      height: height ? String(height) : null, weight: weight ? String(weight) : null, bmi: bmi ? String(bmi.toFixed(1)) : null, bloodPressure,
    }).returning();
    res.json(created);
  }
});

// AI doctor recommendation
router.post("/ai/recommend-doctor", async (req, res) => {
  const { symptoms, specialty, patientHistory } = req.body;

  const doctors = await db.select().from(usersTable).where(eq(usersTable.role, "doctor"));

  const prompt = `You are a medical triage AI. Based on patient symptoms, recommend which type of doctor to see and rank available doctors.
Symptoms: "${symptoms}"
${specialty ? `Preferred specialty: ${specialty}` : ""}
${patientHistory ? `Patient history: ${patientHistory}` : ""}

Available doctors: ${JSON.stringify(doctors.map(d => ({ id: d.id, name: d.name, specialization: d.specialization, rating: d.rating, available: d.availableToday })))}

Respond ONLY with valid JSON:
{
  "recommendedSpecialty": "Cardiology",
  "urgencyLevel": "moderate",
  "reasoning": "Based on the symptoms...",
  "rankedDoctors": [{"doctorId": 1, "name": "Dr. Name", "specialization": "...", "matchScore": 0.95, "reason": "why this doctor"}],
  "nextSteps": ["Step 1", "Step 2"],
  "confidenceScore": 0.85
}`;

  try {
    const response = await openai.chat.completions.create({ model: "gpt-5.4", max_completion_tokens: 800, messages: [{ role: "user", content: prompt }] });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({ recommendedSpecialty: "General Medicine", urgencyLevel: "moderate", reasoning: "Please consult a general physician.", rankedDoctors: [], nextSteps: ["Book appointment with available doctor"], confidenceScore: 0.5 });
  }
});

export default router;
