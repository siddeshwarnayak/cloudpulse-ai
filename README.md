# CloudPulse AI

**AI-Powered Cloud Infrastructure Monitoring, Anomaly Detection & Cost Optimization Platform**

## Overview

CloudPulse AI is a web dashboard that monitors simulated cloud infrastructure metrics, detects anomalies using deterministic threshold/statistical rules, and uses Anthropic's Claude to turn those anomalies into plain-English root-cause analysis, impact assessments, and recommended actions. It also surfaces simulated cost-optimization opportunities for underutilized resources.

This is an MVP built around a **server-side simulated infrastructure metrics generator** rather than a live AWS CloudWatch integration. The architecture is intentionally modular so the simulator can be swapped for a real CloudWatch data source later without touching the anomaly engine, AI layer, or frontend.

## Problem

Traditional monitoring systems expose raw metrics and alerts but leave developers to manually work out whether behavior is abnormal, what likely caused it, what the impact is, what to do about it, and where money is being wasted on idle resources.

## Solution

CloudPulse AI converts raw infrastructure telemetry into actionable insight through a fixed pipeline:

```
Simulated Cloud Data
  → Persistence (PostgreSQL via Prisma)
  → REST APIs
  → Deterministic Anomaly Detection
  → GenAI Root-Cause Analysis (Claude)
  → Cost Optimization
  → React Dashboard
```

The anomaly engine always decides *whether* something is wrong using fixed rules. Claude is only ever used to *explain* an anomaly the engine has already found — never to decide if one exists.

## Features

- Simulated EC2 / RDS / S3 metrics with realistic, correlated behavior (traffic surges, idle periods, resource-specific baselines)
- A simulated clock decoupled from wall-clock time (1 real second = 10 simulated minutes by default) so 24-hour idle/waste patterns emerge in minutes, not days
- Deterministic anomaly detection for CPU, memory, traffic, response time, and idle/waste
- Incident deduplication with open-incident checks and a post-resolution cooldown
- Claude-generated root-cause analysis with strict JSON schema validation and a safe rule-based fallback if the API key is missing or the call fails
- Claude-generated cost-optimization recommendations with explicitly labeled **estimated monthly savings** (never presented as real AWS billing data)
- Full REST API with centralized error handling, request validation, and no leaked stack traces
- JWT-based auth (register/login) with bcrypt password hashing
- React + Vite dashboard, plain CSS design system (no UI framework), light theme only
- Custom glassmorphism system: blurred ambient orbs, cursor-tracked 3D card tilt, hover sheen
- A continuously animated SVG "infrastructure control center" visualization: orbital rings around a floating AI core, glass infrastructure nodes (EC2/RDS/S3/Dashboard) with health-responsive pulse, and particles animating along curved data-flow paths — all built with native SVG/CSS (no Three.js), and fully disabled under `prefers-reduced-motion`
- Fully API-driven frontend — no hardcoded dashboard data
- Explicit loading / empty / error / AI-unavailable / backend-unavailable states throughout

## Architecture

```
backend/
  Express REST API
  Prisma 7 ORM → PostgreSQL 16 (Docker)
  services/simulation  → simulated clock + per-resource-type metric generator + tick loop
  services/anomaly     → deterministic threshold/statistical rules, dedup/cooldown
  services/ai          → isolated Anthropic Claude integration (never called from routes directly)
  services/cost        → simulated pricing + AI-assisted right-sizing recommendations

frontend/
  React + Vite
  services/api.js      → single API client, all dashboard data comes from here
  components/          → glass cards, charts, alerts, AI insight panel, infra visualization
  pages/                → Dashboard, Resources, Anomalies, Cost
```

**Simulation → Incident flow:** every tick, the simulator generates a metric for each active resource, writes it to Postgres with a *simulated* timestamp, runs the deterministic anomaly rules, and — if a new (non-duplicate) anomaly is found — calls the AI service to get a structured explanation, then stores an `Incident`. If the AI call fails for any reason, a fallback analysis is stored instead so the incident is never lost. Idle/waste detections skip the incident path entirely and instead produce a `Cost` recommendation.

## Tech stack

- **Frontend:** React, Vite, JavaScript, plain CSS with CSS variables (no Tailwind/Bootstrap/UI kit), react-router-dom
- **Backend:** Node.js, Express, REST
- **Database:** PostgreSQL 16, Prisma 7
- **AI:** Anthropic API, `claude-sonnet-4-6`, `max_tokens: 1000`
- **Local infra:** Docker Desktop, WSL 2 (Windows), Docker Compose

## Folder structure

```text
cloudpulse-ai/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/        env + Prisma client singleton
│   │   ├── controllers/   route handlers (thin, delegate to services)
│   │   ├── middleware/    auth, validation, centralized error handling
│   │   ├── routes/        Express routers
│   │   ├── services/
│   │   │   ├── simulation/  simClock, generator, simulator loop
│   │   │   ├── anomaly/     anomalyEngine (deterministic rules)
│   │   │   ├── ai/          aiService (Claude integration)
│   │   │   └── cost/        costService
│   │   ├── utils/          logger, apiResponse helpers, seed script
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma.config.ts    Prisma 7 connection config (NOT in schema.prisma)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/       api.js (all backend calls)
│   │   ├── hooks/          usePolling, useTilt
│   │   ├── utils/          formatting helpers
│   │   ├── styles/         global.css, components.css, chart.css, visualization.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── .gitignore
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- Docker Desktop (with WSL 2 backend on Windows)
- WSL 2 (Windows only)
- Git

## PostgreSQL setup

```bash
docker compose up -d
docker ps
```

You should see a `cloudpulse-postgres` container listening on `5432`.

## Environment variables

Copy the example files and fill in `ANTHROPIC_API_KEY` if you want live AI analysis:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

```env
DATABASE_URL="postgresql://cloudpulse:cloudpulse@localhost:5432/cloudpulse?schema=public"
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
ANTHROPIC_API_KEY=
SIMULATION_TIME_MULTIPLIER=10
METRIC_TICK_INTERVAL_MS=3000
JWT_SECRET=change-me-in-production
```

`ANTHROPIC_API_KEY` is **never** exposed to the frontend — the frontend only ever talks to the backend's own REST API (`VITE_API_BASE_URL`).

Important notes about Anthropic and local development:

- `ANTHROPIC_API_KEY` is a server-side secret. Add it to `backend/.env` only. Do NOT place this key in any frontend files or environment intended for client-side consumption.
- If `ANTHROPIC_API_KEY` is not set, the backend will not crash — it sets `aiEnabled` to false and uses deterministic, rule-based fallback analyses and cost recommendations. UI elements clearly label fallback results as "Rule-based fallback" while AI outputs are labeled "AI generated".

To restart services locally:

Backend (from project root):

```bash
cd backend
npm install
npm run dev
```

Frontend (from project root):

```bash
cd frontend
npm install
npm run dev
```

If a port is already in use, stop the conflicting process (e.g., `taskkill /PID <pid> /F` on Windows) and restart the dev server. Ensure `FRONTEND_ORIGIN` in `backend/.env` matches the frontend origin (default `http://localhost:5173`).

## Database setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

This generates the Prisma client into `backend/src/generated/prisma` and creates the tables (`users`, `resources`, `metrics`, `incidents`, `costs`).

## Running the backend

```bash
cd backend
npm run dev
```

On startup the backend will:
1. Verify the Postgres connection (and report clearly if it can't connect, without crashing).
2. Seed the five default resources (idempotent — safe to restart repeatedly).
3. Start the simulator loop.
4. Log a warning if `ANTHROPIC_API_KEY` isn't set (the app still works, using rule-based fallback analysis).

Backend runs on `http://localhost:4000`.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Simulated metrics

The simulator does **not** use `Date.now()` for metric timestamps. A `SimClock` tracks a separate simulated timestamp that advances every tick by `METRIC_TICK_INTERVAL_MS × SIMULATION_TIME_MULTIPLIER` simulated minutes. With the defaults (`METRIC_TICK_INTERVAL_MS=3000`, `SIMULATION_TIME_MULTIPLIER=10`):

- 1 real second → 10 simulated minutes
- 24 simulated hours → ~144 real seconds

The clock starts 24 simulated hours in the past so idle/waste detection has meaningful history almost immediately after boot.

Each resource type has distinct generator logic:
- **EC2:** CPU/memory/response time correlate with request count, with occasional traffic surges.
- **RDS:** higher baseline memory, CPU driven more by query/workload activity, response time sensitive to load.
- **S3:** only network + request count are generated; `cpu` and `memory` are always `null`.

## Anomaly detection

All rules are deterministic — Claude is never used to decide whether an anomaly exists.

| Rule | Condition |
|---|---|
| CPU | current CPU > 85% OR current CPU > 1.5× trailing 20-reading average |
| Memory | > 85% for at least 3 consecutive readings |
| Traffic | request count > 2× trailing average |
| Response time | > 3 seconds |
| Idle/waste | utilization < 15% for at least 24 simulated hours (routes to Cost, not Incidents) |

**Deduplication:** a new incident is not created for a resource + anomaly type combination while an incident of that type is still `open`. After an incident is resolved, a cooldown window (15 simulated minutes) must pass before the same resource + anomaly type can trigger a new incident, to avoid flapping right at the resolve boundary.

## GenAI integration

The AI service (`backend/src/services/ai/aiService.js`) is the only place that calls the Anthropic API — route handlers never call it directly. The exact prompt structure specified for this project is used:

```
ROLE: You are a cloud infrastructure analyst.
TASK: Analyze the provided infrastructure metrics and identify the likely cause of the anomaly.
INPUT: {cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType}
REQUIREMENTS: severity + cause + impact + 2-4 recommendations, returned as strict JSON only.
```

Model: `claude-sonnet-4-6`, `max_tokens: 1000`. The response is stripped of accidental code fences, parsed, and validated against the expected schema. If the API key is missing, the call fails, or the response is malformed, a clearly-labeled rule-based fallback analysis is returned instead — the incident is still stored and the dashboard still renders it, it's just tagged "Rule-based fallback" instead of "AI generated" in the UI.

## Cost optimization

When the idle/waste rule fires, the cost service builds a prompt describing the resource type, current simulated size, utilization, and running duration, and asks Claude for a utilization assessment, a recommended size/type, and an estimated monthly saving. All pricing is transparent, simulated, and clearly labeled — **never** presented as real AWS billing data. If AI is unavailable, a conservative rule-based estimate is used instead.

## REST API

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/resources` | List resources with latest metric + open incident count |
| GET | `/api/resources/:id` | Resource detail + recent metrics/incidents |
| GET | `/api/metrics` | Recent metrics across all resources (bounded window) |
| GET | `/api/metrics/:resourceId` | Recent metrics for one resource |
| GET | `/api/anomalies` | List incidents (optional `?status=open\|resolved`) |
| POST | `/api/anomalies/analyze` | On-demand AI analysis of a metric snapshot |
| POST | `/api/anomalies/:id/resolve` | Mark an incident resolved |
| POST | `/api/ai/analyze` | Generic anomaly analysis endpoint |
| POST | `/api/ai/recommend` | Generic cost recommendation endpoint |
| GET | `/api/cost` | Current estimated monthly cost summary |
| GET | `/api/cost/recommendations` | Stored cost recommendations |
| GET | `/api/health` | DB connectivity, AI-enabled flag, simulator status |

All responses use `{ success, data }` or `{ success: false, error: { message } }`. Internal stack traces are never sent to the client.

## Troubleshooting (Windows)

If PowerShell blocks `npm` with an execution-policy error (`npm.ps1 cannot be loaded...`), use the `.cmd` shim as a fallback:

```powershell
npm.cmd install
npm.cmd run dev
```

The normal `npm install` / `npm run dev` scripts documented above remain the standard way to run the project; this is only a fallback for restrictive PowerShell policies.

## Future roadmap

- **Phase 2:** Replace the simulator with real AWS CloudWatch integration behind the same `services/simulation` interface.
- **Phase 3:** Real AWS Cost Explorer / billing API integration to replace simulated pricing.
- **Phase 4:** Advanced ML-based anomaly detection (e.g. seasonal decomposition, learned baselines) alongside — not instead of — the deterministic rules.

## Known limitations

- This MVP uses a simulated metrics generator, not live cloud data.
- Simulated pricing is illustrative and not tied to real AWS rate cards.
- The AI-generated severity is advisory; the deterministic engine's severity is authoritative unless AI assesses something as *more* severe.
- Single-process simulator: horizontal scaling of the backend would require moving tick ownership to a single leader (e.g. via an advisory lock) to avoid duplicate metrics.
