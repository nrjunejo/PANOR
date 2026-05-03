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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// Patients
export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  medicalId: varchar("medical_id", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  bloodGroup: varchar("blood_group", { length: 10 }),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  activeConditions: jsonb("active_conditions").$type<string[]>().default([]),
  riskScore: integer("risk_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;

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
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
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
  clinicalIntent: text("clinical_intent").notNull(),
  tests: jsonb("tests").$type<Array<{ name: string; code: string; priority: string; instructions: string }>>().default([]),
  priority: varchar("priority", { length: 20 }).notNull().default("routine"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  results: text("results"),
  aiTranslation: text("ai_translation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLabOrderSchema = createInsertSchema(labOrdersTable).omit({ id: true, createdAt: true });
export type InsertLabOrder = z.infer<typeof insertLabOrderSchema>;
export type LabOrder = typeof labOrdersTable.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;

// Billing
export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id).notNull(),
  visitId: integer("visit_id").references(() => visitsTable.id),
  items: jsonb("items").$type<Array<{ description: string; amount: number; category: string }>>().default([]),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
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
  caseCount: integer("case_count").notNull().default(0),
  lat: numeric("lat", { precision: 10, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 6 }).notNull(),
  outbreakProbability: numeric("outbreak_probability", { precision: 5, scale: 2 }).notNull().default("0"),
  trend: varchar("trend", { length: 20 }).notNull().default("stable"),
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
  isResolved: boolean("is_resolved").default(false),
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
  eventDate: timestamp("event_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEventsTable).omit({ id: true, createdAt: true });
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
