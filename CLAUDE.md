# Arbitr — Claude Code Configuration

## Project Overview

Arbitr is a configurable jury-based project selection platform. Multi-portal web app (Admin, Evaluator, Submitter, Results) with blind evaluation, weighted scoring, and configurable matrix visualization.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + TanStack Query + Zustand
- **Backend**: Node.js + Fastify + Prisma ORM
- **Database**: PostgreSQL 16 (Cloud SQL on GCP)
- **Language**: TypeScript strict everywhere
- **Validation**: Zod (shared schemas front/back)
- **Auth**: JWT (access 15min + refresh 7d), bcrypt hashed codes
- **Deployment**: GCP (Cloud Run + Cloud SQL + Cloud Storage)
- **CI/CD**: GitHub Actions → Cloud Build → Cloud Run
- **Repo**: https://github.com/Nicolas78240/Arbitr.git

## Project Structure

```
arbitr/
├── apps/
│   ├── api/          → Fastify backend (port 3001)
│   └── web/          → Next.js 14 frontend (port 3000)
├── packages/
│   ├── types/        → Shared TypeScript DTOs & enums
│   ├── validation/   → Shared Zod schemas
│   └── scoring/      → Pure scoring functions
├── infra/            → Terraform/GCP config
├── docker/           → Dockerfiles
├── docs/             → PRD, architecture
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
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:scoring     # Run scoring package tests

# Linting & Types
pnpm lint             # ESLint all packages
pnpm typecheck        # tsc --noEmit everywhere

# Deploy
pnpm deploy:staging   # Deploy to GCP staging
pnpm deploy:prod      # Deploy to GCP production
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
- GCP deployment: Cloud Run (stateless containers), Cloud SQL (managed Postgres), Cloud Storage (file uploads)

## GCP Configuration

- **Project**: `arbitr-prod` (to be created)
- **Region**: `europe-west1` (Belgium — closest to Club Med HQ Paris)
- **Account**: lacausse@gmail.com
- **Services**: Cloud Run, Cloud SQL, Cloud Storage, Cloud Build, Secret Manager

## Key Business Rules

1. Evaluators NEVER see other evaluators' scores during ACTIVE session
2. Results (matrix/ranking) only visible when session status = CLOSED
3. Teams can submit exactly ONE project per session (409 on duplicate)
4. Criteria weights must sum to 100% per axis (X and Y independently)
5. Score formula: `scoreAxis = Σ(avg_evaluators(criterion_i) × weight_i) / Σ(weights)`
6. Quadrant assignment based on configurable X/Y thresholds
7. All access codes are bcrypt hashed — never stored or logged in cleartext
