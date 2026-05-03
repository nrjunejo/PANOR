# PANOR — Patient-Augmented Networked Omni-Records

## Overview

PANOR is a production-ready GenAI-powered clinical intelligence platform for Pakistan's healthcare system. Built as a full-stack monorepo (React + Vite frontend, Express API server, PostgreSQL + Drizzle ORM, OpenAI via Replit AI Integration).

## Architecture

- **Frontend** (`artifacts/panor`) — React + Vite + Tailwind, dark navy/teal theme, Wouter routing, TanStack Query
- **API Server** (`artifacts/api-server`) — Express + TypeScript, Drizzle ORM, Pino logging
- **Database** — PostgreSQL (Replit-provisioned), Drizzle ORM schema
- **AI** — OpenAI GPT via Replit AI Integration (`@workspace/integrations-openai-ai-server`)
- **API Contract** — OpenAPI spec in `lib/api-spec/openapi.yaml`, Zod schemas in `lib/api-zod`, React Query hooks in `lib/api-client-react`

## Demo Accounts (password: 123456 for all)

| Role | Email | Dashboard |
|------|-------|-----------|
| Patient | patient@panor.ai | `/patient` — AI symptom intake, timeline, meds, billing |
| Doctor | doctor@panor.ai | `/doctor` — AI co-pilot, drug safety guardian, prescription module |
| Lab Tech | lab@panor.ai | `/lab` — order management with AI-translated instructions |
| Analyst | analyst@panor.ai | `/analytics` — epidemiology radar, disease clusters, Recharts trends |
| Admin | admin@panor.ai | `/admin` — patient registry, appointments, billing overview |

## Features

- **AI Co-pilot** — Doctor enters clinical notes → differential diagnoses with confidence bars + "Why?" explanation
- **Drug Safety Guardian** — Real-time interaction checking (safe/warning/blocked) with alternative suggestions
- **Lab Translator** — Clinical intent → specific lab tests with instructions, priority badges
- **Epidemiology Radar** — Disease cluster monitoring with outbreak probability scores + Recharts trends
- **AI Symptom Intake** — Patient-reported symptoms → structured clinical assessment
- **Medical Timeline** — Per-patient event history (visits, prescriptions, labs, alerts)
- **Smart Billing** — Bill creation, payment tracking, AI-generated summaries
- **5 Role Dashboards** — Each role sees a distinct, purpose-built interface

## Key Files

- `lib/api-spec/openapi.yaml` — Full OpenAPI contract
- `lib/db/src/schema/panor.ts` — Database schema (users, patients, visits, prescriptions, lab_orders, appointments, bills, disease_clusters, alerts, timeline_events)
- `artifacts/api-server/src/routes/panor/` — All backend route handlers
- `artifacts/panor/src/pages/` — All 5 role dashboards + Login
- `artifacts/panor/src/hooks/useAuth.tsx` — Auth context (token stored in localStorage)
- `artifacts/panor/src/components/` — Sidebar, StatCard, ConfidenceBar, SeverityBadge, SkeletonCard

## Running

Both workflows start automatically:
- `artifacts/api-server: API Server` — Express server on port 8080, routed at `/api`
- `artifacts/panor: web` — Vite dev server, routed at `/`

## CSS Theme

Dark navy background (`hsl(215 28% 7%)`), teal primary (`hsl(199 89% 48%)`), crimson for critical alerts, amber for warnings, emerald for safe states. All CSS vars are space-separated HSL (no `hsl()` wrapper).
