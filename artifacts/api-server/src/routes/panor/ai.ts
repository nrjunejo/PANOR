import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, prescriptionsTable, visitsTable } from "@workspace/db";
import { AiIntakeSummaryBody, AiCopilotBody, AiLabTranslateBody, AiFollowupBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/ai/intake-summary", async (req, res) => {
  const body = AiIntakeSummaryBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const prompt = `You are a clinical AI intake processor. Analyze these patient-reported symptoms and produce a structured clinical summary.
Symptoms: "${body.data.symptoms}"
Language: ${body.data.language ?? "en"}

Respond ONLY with valid JSON:
{
  "chiefComplaint": "main complaint in medical terms",
  "structuredSymptoms": [{"symptom": "name", "duration": "e.g. 3 days", "severity": "mild/moderate/severe"}],
  "urgencyLevel": "low|moderate|high|critical",
  "aiExplanation": "brief clinical reasoning (1-2 sentences)",
  "confidenceScore": 0.0-1.0,
  "suggestedSpecialty": "e.g. Cardiology"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({
      chiefComplaint: body.data.symptoms.slice(0, 100),
      structuredSymptoms: [{ symptom: "Reported symptoms", duration: "Unknown", severity: "moderate" }],
      urgencyLevel: "moderate",
      aiExplanation: "Unable to process symptoms. Please consult with the attending physician.",
      confidenceScore: 0.5,
      suggestedSpecialty: "General Medicine",
    });
  }
});

router.post("/ai/copilot", async (req, res) => {
  const body = AiCopilotBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const prompt = `You are a senior physician AI co-pilot. Analyze this clinical scenario and provide differential diagnosis.
Clinical notes: "${body.data.clinicalNotes}"
${body.data.symptoms ? `Symptoms: ${body.data.symptoms}` : ""}
${body.data.patientHistory ? `Patient history: ${body.data.patientHistory}` : ""}

Respond ONLY with valid JSON:
{
  "differentialDiagnoses": [
    {
      "diagnosis": "name",
      "probability": 0.0-1.0,
      "reasoning": "clinical reasoning",
      "urgency": "low|moderate|high|critical",
      "contributingSymptoms": ["symptom1", "symptom2"]
    }
  ],
  "riskAlerts": [{"alert": "alert text", "severity": "warning|critical", "explanation": "why"}],
  "recommendedActions": ["action1", "action2"],
  "confidenceScore": 0.0-1.0,
  "aiExplanation": "overall reasoning summary"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({
      differentialDiagnoses: [{ diagnosis: "Undetermined", probability: 0.5, reasoning: "Insufficient data", urgency: "moderate", contributingSymptoms: [] }],
      riskAlerts: [],
      recommendedActions: ["Complete physical examination", "Review patient history"],
      confidenceScore: 0.3,
      aiExplanation: "AI analysis unavailable. Apply clinical judgment.",
    });
  }
});

router.post("/ai/lab-translate", async (req, res) => {
  const body = AiLabTranslateBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const prompt = `You are a medical lab AI. Translate clinical intent to specific lab tests.
Clinical intent: "${body.data.clinicalIntent}"
Priority: ${body.data.priority ?? "routine"}

Respond ONLY with valid JSON:
{
  "tests": [{"name": "test name", "code": "CODE", "priority": "${body.data.priority ?? "routine"}", "instructions": "specific lab instructions", "rationale": "why ordered"}],
  "aiExplanation": "brief explanation",
  "totalEstimatedTime": "e.g. 2-4 hours"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({
      tests: [{ name: "Complete Blood Count", code: "CBC", priority: body.data.priority ?? "routine", instructions: "Standard venous collection", rationale: "Baseline assessment" }],
      aiExplanation: "Standard panel based on clinical intent.",
      totalEstimatedTime: "2-4 hours",
    });
  }
});

router.post("/ai/followup", async (req, res) => {
  const body = AiFollowupBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [visit] = await db.select().from(visitsTable).where(eq(visitsTable.id, body.data.visitId)).limit(1);

  const prompt = `You are a clinical AI follow-up assessor. Evaluate this patient's recovery.
Original diagnosis: "${visit?.diagnosis ?? "Unknown"}"
Original complaint: "${visit?.chiefComplaint ?? "Unknown"}"
48-hour patient response: "${body.data.patientResponse}"

Respond ONLY with valid JSON:
{
  "status": "improving|stable|deteriorating",
  "assessment": "clinical assessment of response",
  "recommendations": ["recommendation1", "recommendation2"],
  "requiresUrgentAttention": boolean,
  "confidenceScore": 0.0-1.0
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({
      status: "stable",
      assessment: "Patient response received. Unable to complete AI assessment.",
      recommendations: ["Continue prescribed treatment", "Return if symptoms worsen"],
      requiresUrgentAttention: false,
      confidenceScore: 0.4,
    });
  }
});

// /ai/intake — alias used by PatientDashboard chat
router.post("/ai/intake", async (req, res) => {
  const { symptoms, patientId } = req.body;
  if (!symptoms) { res.status(400).json({ error: "symptoms required" }); return; }

  const patient = patientId
    ? await db.select().from(patientsTable).where(eq(patientsTable.id, Number(patientId))).limit(1).then(r => r[0])
    : null;

  const prompt = `You are PANOR AI Health Consultant — a compassionate, medically-trained assistant serving Pakistani patients.
${patient ? `Patient: ${patient.name}, Blood Group: ${patient.bloodGroup}, Allergies: ${(patient.allergies as string[] ?? []).join(", ") || "None"}` : ""}
Patient message: "${symptoms}"

Provide a warm, clear health assessment in 2-3 paragraphs:
1. Acknowledge their concerns and list possible causes
2. Practical home-care advice and when to seek urgent care
3. Recommended specialist if needed

Respond in plain text (no JSON). Be empathetic and write clearly for a general audience.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ assessment: response.choices[0]?.message?.content ?? "Unable to process." });
  } catch {
    res.json({ assessment: "I'm having trouble connecting right now. Please describe your symptoms to your doctor, or call the emergency line if severe." });
  }
});


// /ai/drug-check — Drug safety check
router.post("/ai/drug-check", async (req, res) => {
  const { medication, patientId } = req.body;
  if (!medication) { res.status(400).json({ error: "medication required" }); return; }

  const patient = patientId
    ? await db.select().from(patientsTable).where(eq(patientsTable.id, Number(patientId))).limit(1).then(r => r[0])
    : null;

  const activePrescriptions = patientId
    ? await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, Number(patientId))).then(r => r.filter((p: any) => p.active))
    : [];

  const prompt = `You are a clinical pharmacology AI safety system.
Medication to check: "${medication}"
${patient ? `Patient allergies: ${(patient.allergies as string[] ?? []).join(", ") || "None"}` : ""}
${activePrescriptions.length ? `Current medications: ${activePrescriptions.map((p: any) => p.medication).join(", ")}` : ""}

Respond ONLY with valid JSON:
{
  "safetyStatus": "safe|caution|blocked",
  "reasoning": "detailed pharmacological reasoning",
  "interactions": [{"drug": "drug name", "severity": "minor|moderate|major", "description": "interaction description"}],
  "alternatives": ["alternative medication if blocked"],
  "confidenceScore": 0.0-1.0
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch {
    res.json({
      safetyStatus: "caution",
      reasoning: "Unable to complete automated drug safety check. Please consult BNF or pharmacist.",
      interactions: [],
      alternatives: [],
      confidenceScore: 0.3,
    });
  }
});

export default router;
