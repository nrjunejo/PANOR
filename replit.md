# PANOR — Pakistan's National Healthcare Infrastructure Platform

## Overview

PANOR is a production-ready GenAI-powered clinical intelligence platform for Pakistan's healthcare system. Built as a full-stack monorepo (React + Vite frontend, Express API server, PostgreSQL + Drizzle ORM, OpenAI via Replit AI Integration).

## Architecture

- **Frontend** (`artifacts/panor`) — React + Vite + Tailwind, dark navy/teal theme, Wouter routing, TanStack Query
- **API Server** (`artifacts/api-server`) — Express + TypeScript, Drizzle ORM, Pino logging
- **Database** — PostgreSQL (Replit-provisioned), Drizzle ORM schema
- **AI** — OpenAI GPT-5.4 via Replit AI Integration (`@workspace/integrations-openai-ai-server`)
- **API Contract** — OpenAPI spec in `lib/api-spec/openapi.yaml`, Zod schemas in `lib/api-zod`, React Query hooks in `lib/api-client-react`

## Demo Accounts (password: 123456 for all)

| Role | Email | Dashboard |
|------|-------|-----------|
| Patient | patient@panor.ai | `/patient` — AI health consult, timeline, meds, lab upload, NADRA, booking |
| Doctor | doctor@panor.ai | `/doctor` — AI co-pilot, drug safety, collab threads, dosage scheduling |
| Lab Tech | lab@panor.ai | `/lab` — order queue, PDF upload, AI report parsing |
| Finance | finance@panor.ai | `/finance` — revenue charts, pricing CRUD, payment modal (EasyPaisa/JazzCash/PayPal) |
| Analyst | analyst@panor.ai | `/analytics` — epidemiology radar, disease clusters, outbreak trends |
| Admin | admin@panor.ai | `/admin` — patient registry, appointments, billing overview |

## Features

### AI Endpoints
- `POST /api/ai/intake` — Patient symptom chat → warm clinical assessment
- `POST /api/ai/intake-summary` — Structured JSON symptom analysis
- `POST /api/ai/recommend-doctor` — Symptom-based doctor ranking with speciality match
- `POST /api/ai/drug-check` — Drug interaction safety check (safe/caution/blocked)
- `POST /api/ai/copilot` — Doctor clinical notes → differential diagnoses
- `POST /api/ai/lab-translate` — Clinical intent → specific lab test panel
- `POST /api/ai/followup` — 48hr follow-up recovery assessment

### Core Features
- **AI Health Consult** — Patient chat bot with personalised responses (allergies/blood group aware)
- **AI Co-pilot** — Doctor enters clinical notes → differential diagnoses with confidence bars
- **Drug Safety Guardian** — Real-time interaction checking with allergy + prescription awareness
- **Lab AI Guide** — Clinical intent → specific lab tests, AI-powered PDF report parsing
- **NADRA Integration** — CNIC lookup → identity verification + social welfare scoring
- **Social Welfare Scoring** — Auto-computed from income, location, NADRA status
- **Doctor Collaboration** — Threaded consultation between doctors per patient case
- **Finance Dashboard** — Revenue analytics, service pricing CRUD, multi-method payment processing
- **Multi-method Billing** — EasyPaisa, JazzCash, PayPal, bank transfer, cash
- **Epidemiology Radar** — Disease cluster monitoring with outbreak probability
- **Medical Timeline** — Per-patient event history (visits, prescriptions, labs, alerts)
- **Lab Report Upload** — PDF/image upload → AI parsing → structured values + interpretation
- **Appointment Booking** — AI-recommended doctor selection with booking flow

## Database Schema (key tables)

- `users` — all roles (patient/doctor/lab/finance/analyst/admin), CNIC, specialization, rating
- `patients` — medical ID, NADRA verification, social welfare score, CNIC, address, income
- `patient_health_history` — BMI, chronic conditions, vaccinations, family history, lifestyle
- `visits` / `prescriptions` / `lab_orders` / `appointments` — core clinical workflow
- `lab_reports` — uploaded PDFs, AI-parsed values, interpretation
- `doctor_collaborations` / `collaboration_messages` — inter-doctor consultation threads
- `bills` — invoices with tax, welfare discount, payment method tracking
- `service_pricing` — 20 seeded services across Consultation/Lab/Medicine/Procedure/Admission
- `disease_clusters` / `alerts` / `timeline_events` — epidemiology + notifications

## API Routes

```
/api/auth/*              — login, OTP, register
/api/patients/*          — patient CRUD
/api/doctors/*           — doctor listing
/api/visits/*            — visit management
/api/prescriptions/*     — prescription CRUD
/api/lab/orders          — lab order queue
/api/lab/reports         — PDF upload + AI parsing
/api/appointments/*      — appointment booking
/api/billing/*           — bills (also /api/billing/bills alias)
/api/finance/pricing     — service pricing CRUD
/api/finance/revenue     — revenue analytics
/api/finance/bills/:id/pay — mark bill paid
/api/finance/invoices    — create invoice with tax
/api/doctor/collaborations — threaded doctor consults
/api/patient/profile/:userId — full profile + health history
/api/patient/nadra-lookup — CNIC → NADRA identity data
/api/patient/health-history/:patientId — save health history
/api/ai/intake           — patient symptom chat
/api/ai/intake-summary   — structured symptom analysis
/api/ai/recommend-doctor — AI doctor recommendation
/api/ai/drug-check       — drug interaction safety
/api/ai/copilot          — clinical differential diagnoses
/api/ai/lab-translate    — clinical intent → lab tests
/api/ai/followup         — 48hr follow-up assessment
/api/disease-clusters/*  — epidemiology data
/api/alerts/*            — clinical alerts
/api/timeline/*          — patient event timeline
/api/analytics/*         — system-wide analytics
```

## Key Files

- `lib/api-spec/openapi.yaml` — Full OpenAPI contract
- `lib/db/src/schema/panor.ts` — Complete database schema
- `artifacts/api-server/src/routes/panor/` — All backend route handlers
- `artifacts/panor/src/pages/` — All 6 role dashboards + auth pages
- `artifacts/panor/src/hooks/useAuth.tsx` — Auth context (JWT in localStorage)
- `artifacts/panor/src/App.tsx` — Routing with ProtectedRoute per role

## Running

Both workflows start automatically:
- `artifacts/api-server: API Server` — Express on port 8080, proxied at `/api`
- `artifacts/panor: web` — Vite dev server, proxied at `/`

## CSS Theme

Dark navy background (`hsl(215 28% 7%)`), teal primary (`hsl(199 89% 48%)`), crimson critical, amber warnings, emerald safe. All CSS vars use space-separated HSL (no `hsl()` wrapper).
