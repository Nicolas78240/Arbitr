# Arbitr — Claude Code Configuration

## Project Overview

Arbitr is a configurable jury-based project selection platform. Multi-portal web app (Admin, Evaluator, Submitter, Results) with blind evaluation, weighted scoring, and configurable matrix visualization.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui + TanStack Query + Zustand
- **Backend**: Node.js + Fastify + Prisma ORM
- **Database**: PostgreSQL 16 (Supabase — free tier)
- **Language**: TypeScript strict everywhere
- **Validation**: Zod (shared schemas front/back)
- **Auth**: JWT (access 15min + refresh 7d), bcrypt hashed codes
- **Deployment**: GCP Cloud Run (API + Web) + Supabase (DB)
- **CI/CD**: Manual via gcloud CLI + Cloud Build
- **Repo**: https://github.com/Nicolas78240/Arbitr.git

## Project Structure

```
arbitr/
├── apps/
│   ├── api/          → Fastify backend (port 3001 local, 8080 prod)
│   └── web/          → Next.js 15 frontend (port 3000 local, 8080 prod)
├── packages/
│   ├── types/        → Shared TypeScript DTOs & enums
│   ├── validation/   → Shared Zod schemas
│   └── scoring/      → Pure scoring functions
├── docker/           → Dockerfiles (API + Web multi-stage builds)
├── docs/             → PRD, architecture
├── cloudbuild-api.yaml  → Cloud Build config for API image
├── cloudbuild-web.yaml  → Cloud Build config for Web image
└── turbo.json
```

## Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm dev:api          # Start API only
pnpm dev:web          # Start frontend only

# Build
pnpm build            # Build all packages and apps
pnpm build:api        # Build API only
pnpm build:web        # Build frontend only

# Database
pnpm db:migrate       # Run Prisma migrations
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio
pnpm db:reset         # Reset DB + seed

# Testing
pnpm test             # Run all tests (Vitest)
pnpm test:scoring     # Run scoring package tests

# Linting & Types
pnpm lint             # ESLint all packages
pnpm typecheck        # tsc --noEmit everywhere

# Deploy (manual via Cloud Build + gcloud)
gcloud builds submit --config=cloudbuild-api.yaml --project=arbitr-prod
gcloud builds submit --config=cloudbuild-web.yaml --project=arbitr-prod
gcloud run deploy arbitr-api --image=europe-west1-docker.pkg.dev/arbitr-prod/arbitr/api:<tag> --region=europe-west1 --project=arbitr-prod
gcloud run deploy arbitr-web --image=europe-west1-docker.pkg.dev/arbitr-prod/arbitr/web:<tag> --region=europe-west1 --project=arbitr-prod
```

## Code Conventions

- **Language**: All code, comments, and git commits in English
- **PRD & docs**: French (original spec language)
- **Naming**: camelCase for variables/functions, PascalCase for types/components
- **Imports**: Use `@arbitr/types`, `@arbitr/validation`, `@arbitr/scoring` for shared packages
- **API routes**: RESTful, all return `Content-Type: application/json`
- **Error format**: `{ error: "CODE", message: "Human readable", statusCode: number }`
- **Auth**: JWT in Authorization Bearer header, never cookies/localStorage
- **Validation**: Zod on every API input, shared schemas in `packages/validation`
- **DB**: Prisma transactions for multi-table ops, `@@unique` constraints enforced
- **Tests**: Vitest for unit, Playwright for E2E. Scoring package must have 100% coverage.
- **No secrets in code**: All secrets via env vars, codes always bcrypt hashed

## Architecture Decisions

- Frontend is a pure API client — no Server Actions, no Next.js Route Handlers
- Auth strategy pattern: `AuthStrategyRegistry` for SSO-ready design (v1 = codes, v2 = OIDC/SAML)
- Scoring logic isolated in `packages/scoring` — pure functions, no deps
- Evaluator blindness enforced at API level (middleware checks)
- Session status gates: DRAFT → ACTIVE → CLOSED controls all access rules
- GCP deployment: Cloud Run (stateless containers), Supabase (managed Postgres)
- File uploads are ephemeral (container filesystem) — acceptable for POC
- ESM modules: all relative imports in shared packages must use `.js` extensions

## Deployment Configuration

- **GCP Project**: `arbitr-prod` (project number: 302282679184)
- **Region**: `europe-west1` (Belgium)
- **Account**: lacausse@gmail.com
- **GCP Services**: Cloud Run, Artifact Registry, Secret Manager, Cloud Build
- **Artifact Registry**: `europe-west1-docker.pkg.dev/arbitr-prod/arbitr`
- **Database**: Supabase PostgreSQL (project ref: `cjywhuwfsulgdiriykou`, region: eu-west-3 Paris)
- **API URL**: https://arbitr-api-302282679184.europe-west1.run.app
- **Web URL**: https://arbitr-web-302282679184.europe-west1.run.app
- **Secrets** (in GCP Secret Manager): DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
- **Cloud Run config**: 512Mi RAM, 1 CPU, 0–3 instances, port 8080
- **DB connection**: Direct connection (port 5432), not pooler

### Deploy workflow
1. Build API image via Cloud Build → push to Artifact Registry
2. Deploy API to Cloud Run → get API URL
3. Build Web image with `NEXT_PUBLIC_API_URL=<API_URL>` → push to Artifact Registry
4. Deploy Web to Cloud Run
5. Update API `CORS_ORIGIN` env var with Web URL

### Known limitations (POC)
- Supabase free tier: 500MB DB, pauses after 1 week of inactivity
- File uploads lost on container restart (ephemeral filesystem)
- No custom domain (*.run.app URLs)
- No CI/CD pipeline (manual deploys)
- No staging environment

## Key Business Rules

1. Evaluators NEVER see other evaluators' scores during ACTIVE session
2. Results (matrix/ranking) only visible when session status = CLOSED
3. Teams can submit exactly ONE project per session (409 on duplicate)
4. Criteria weights must sum to 100% per axis (X and Y independently)
5. Score formula: `scoreAxis = Σ(avg_evaluators(criterion_i) × weight_i) / Σ(weights)`
6. Quadrant assignment based on configurable X/Y thresholds
7. All access codes are bcrypt hashed — never stored or logged in cleartext
