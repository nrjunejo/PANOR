import { pgTable, serial, text, integer, boolean, timestamp, numeric, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Users (all roles)
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("patient"),
  specialization: text("specialization"),
  qualifications: text("qualifications"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.5"),
  availableToday: boolean("available_today").default(true),
  isVerified: boolean("is_verified").default(false),
  phone: varchar("phone", { length: 20 }),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// OTP Codes
export const otpCodesTable = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 30 }).notNull().default("signup"),
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients
export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  medicalId: varchar("medical_id", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  cnicNumber: varchar("cnic_number", { length: 20 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  activeConditions: jsonb("active_conditions").$type<string[]>().default([]),
  riskScore: integer("risk_score").default(0),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  province: varchar("province", { length: 100 }),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  socialWelfareScore: integer("social_welfare_score").default(0),
  welfareEligible: boolean("welfare_eligible").default(false),
  nadraVerified: boolean("nadra_verified").default(false),
  insuranceNumber: varchar("insurance_number", { length: 50 }),
  occupation: text("occupation"),
  education: varchar("education", { length: 100 }),
  monthlyIncome: numeric("monthly_income", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;

// Patient Health History (detailed)
export const patientHealthHistoryTable = pgTable("patient_health_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  familyHistory: jsonb("family_history").$type<string[]>().default([]),
  pastSurgeries: jsonb("past_surgeries").$type<Array<{ procedure: string; year: string; hospital: string }>>().default([]),
  chronicConditions: jsonb("chronic_conditions").$type<string[]>().default([]),
  vaccinations: jsonb("vaccinations").$type<Array<{ vaccine: string; date: string; dose: string }>>().default([]),
  smokingStatus: varchar("smoking_status", { length: 20 }).default("never"),
  alcoholUse: boolean("alcohol_use").default(false),
  exerciseFrequency: varchar("exercise_frequency", { length: 30 }),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]),
  height: numeric("height", { precision: 5, scale: 2 }),
  weight: numeric("weight", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 5, scale: 2 }),
  bloodPressure: varchar("blood_pressure", { length: 20 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Visits
export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  doctorId: integer("doctor_id").references(() => usersTable.id).notNull(),
  chiefComplaint: text("chief_complaint").notNull(),
  symptoms: text("symptoms"),
  clinicalNotes: text("clinical_notes"),
  aiSummary: text("ai_summary"),
  diagnosis: text("diagnosis"),
  followupDate: text("followup_date"),
  followupNotes: text("followup_notes"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;

// Prescriptions
export const prescriptionsTable = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => visitsTable.id).notNull(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  prescribedBy: integer("prescribed_by").references(() => usersTable.id),
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  timings: jsonb("timings").$type<Array<{ time: string; amount: string; instructions: string }>>().default([]),
  instructions: text("instructions"),
  safetyStatus: varchar("safety_status", { length: 20 }).notNull().default("safe"),
  interactionWarning: text("interaction_warning"),
  active: boolean("active").default(true),
  prescribedAt: timestamp("prescribed_at").defaultNow().notNull(),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({ id: true, prescribedAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;

// Lab Orders
export const labOrdersTable = pgTable("lab_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  visitId: integer("visit_id").references(() => visitsTable.id),
  requestedBy: integer("requested_by").references(() => usersTable.id),
  clinicalIntent: text("clinical_intent").notNull(),
  tests: jsonb("tests").$type<Array<{ name: string; code: string; priority: string; instructions: string; rationale?: string }>>().default([]),
  priority: varchar("priority", { length: 20 }).notNull().default("routine"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  results: text("results"),
  reportUrl: text("report_url"),
  aiTranslation: text("ai_translation"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLabOrderSchema = createInsertSchema(labOrdersTable).omit({ id: true, createdAt: true });
export type InsertLabOrder = z.infer<typeof insertLabOrderSchema>;
export type LabOrder = typeof labOrdersTable.$inferSelect;

// Lab Reports (uploaded PDF/images)
export const labReportsTable = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  labOrderId: integer("lab_order_id").references(() => labOrdersTable.id),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id),
  fileName: text("file_name").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  fileData: text("file_data"),
  aiParsedData: jsonb("ai_parsed_data").$type<Record<string, any>>(),
  parsedValues: jsonb("parsed_values").$type<Array<{ test: string; value: string; unit: string; normalRange: string; status: string }>>().default([]),
  interpretation: text("interpretation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments
export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  doctorId: integer("doctor_id").references(() => usersTable.id).notNull(),
  specialty: text("specialty").notNull(),
  datetime: text("datetime").notNull(),
  duration: integer("duration").notNull().default(30),
  status: varchar("status", { length: 30 }).notNull().default("scheduled"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  aiSuggested: boolean("ai_suggested").default(false),
  notes: text("notes"),
  symptoms: text("symptoms"),
  followupForVisitId: integer("followup_for_visit_id").references(() => visitsTable.id),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;

// Doctor Collaborations
export const doctorCollaborationsTable = pgTable("doctor_collaborations", {
  id: serial("id").primaryKey(),
  initiatorId: integer("initiator_id").references(() => usersTable.id).notNull(),
  consultantId: integer("consultant_id").references(() => usersTable.id).notNull(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  visitId: integer("visit_id").references(() => visitsTable.id),
  subject: text("subject").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collaborationMessagesTable = pgTable("collaboration_messages", {
  id: serial("id").primaryKey(),
  collaborationId: integer("collaboration_id").references(() => doctorCollaborationsTable.id).notNull(),
  senderId: integer("sender_id").references(() => usersTable.id).notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service Pricing (Finance)
export const servicePricingTable = pgTable("service_pricing", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  serviceName: text("service_name").notNull(),
  serviceCode: varchar("service_code", { length: 20 }).notNull().unique(),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  welfareDiscount: numeric("welfare_discount", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Billing
export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  visitId: integer("visit_id").references(() => visitsTable.id),
  invoiceNumber: varchar("invoice_number", { length: 30 }),
  items: jsonb("items").$type<Array<{ description: string; amount: number; category: string; taxAmount?: number; serviceCode?: string }>>().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 30 }),
  paymentReference: text("payment_reference"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;

// Disease Clusters (Epidemiology)
export const diseaseClustersTable = pgTable("disease_clusters", {
  id: serial("id").primaryKey(),
  disease: text("disease").notNull(),
  region: text("region").notNull(),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  province: varchar("province", { length: 100 }),
  caseCount: integer("case_count").notNull().default(0),
  deaths: integer("deaths").default(0),
  recovered: integer("recovered").default(0),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  outbreakProbability: numeric("outbreak_probability", { precision: 5, scale: 2 }).notNull().default("0"),
  trend: varchar("trend", { length: 20 }).notNull().default("stable"),
  alertLevel: varchar("alert_level", { length: 20 }).default("green"),
  firstDetected: timestamp("first_detected").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertDiseaseClusterSchema = createInsertSchema(diseaseClustersTable).omit({ id: true });
export type InsertDiseaseCluster = z.infer<typeof insertDiseaseClusterSchema>;
export type DiseaseCluster = typeof diseaseClustersTable.$inferSelect;

// Alerts
export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  region: text("region"),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;

// Timeline Events
export const timelineEventsTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }),
  referenceId: integer("reference_id"),
  referenceType: varchar("reference_type", { length: 30 }),
  eventDate: timestamp("event_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEventsTable).omit({ id: true, createdAt: true });
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
