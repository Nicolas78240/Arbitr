# Arbitr — Architecture Document

> Version 1.0 · Feb 2026 · Stack: Turborepo + Next.js 14 + Fastify + Prisma + PostgreSQL · Deploy: GCP

---

## 1. System Overview

```
┌─────────────┐     HTTPS      ┌──────────────┐     SQL      ┌────────────┐
│  Next.js 14 │ ──────────────→│  Fastify API │ ───────────→│ Cloud SQL  │
│  (Cloud Run)│ ←──────────────│  (Cloud Run) │ ←───────────│ PostgreSQL │
│  port 3000  │   JSON / JWT   │  port 3001   │             │    16      │
└─────────────┘                └──────┬───────┘             └────────────┘
                                      │
                                      │ Upload
                                      ▼
                               ┌──────────────┐
                               │Cloud Storage │
                               │  (files)     │
                               └──────────────┘
```

## 2. Monorepo Structure

```
arbitr/
├── apps/
│   ├── api/                    → Fastify backend
│   │   ├── src/
│   │   │   ├── app.ts          → Bootstrap + plugin registration
│   │   │   ├── plugins/        → Fastify plugins (prisma, jwt, cors, helmet, rate-limit, multipart)
│   │   │   ├── auth/           → AuthStrategyRegistry + strategies + routes
│   │   │   ├── routes/         → REST route modules
│   │   │   ├── services/       → Business logic (scoring, export, upload)
│   │   │   └── middleware/     → JWT verification + role guard
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    → Next.js 14 App Router
│       ├── src/
│       │   ├── app/
│       │   │   ├── (portals)/admin/
│       │   │   ├── (portals)/evaluate/
│       │   │   ├── (portals)/submit/
│       │   │   ├── (portals)/results/[sessionId]/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx    → Landing with 3 portal cards
│       │   ├── components/     → ui/ (shadcn), admin/, evaluate/, results/
│       │   ├── lib/
│       │   │   ├── api-client.ts   → Typed fetch wrapper
│       │   │   └── auth-store.ts   → Zustand JWT store
│       │   └── hooks/
│       │       └── use-api.ts      → TanStack Query wrappers
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── types/                  → Shared DTOs, enums, JWTPayload
│   ├── validation/             → Shared Zod schemas (front + back)
│   └── scoring/                → computeScores(), assignQuadrant() — pure functions
├── infra/                      → Terraform GCP config
│   ├── main.tf
│   ├── variables.tf
│   ├── cloud-run.tf
│   ├── cloud-sql.tf
│   ├── cloud-storage.tf
│   └── secrets.tf
├── .github/workflows/
│   ├── ci.yml                  → Lint + typecheck + test on PR
│   └── deploy.yml              → Build + deploy to GCP on main push
├── docker-compose.yml          → Local dev (postgres + api + web)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 3. GCP Deployment Architecture

### 3.1 Services Used

| GCP Service | Usage | Config |
|---|---|---|
| **Cloud Run** (api) | Fastify backend container | europe-west1, min 0 / max 10 instances, 512MB RAM |
| **Cloud Run** (web) | Next.js frontend container | europe-west1, min 0 / max 5 instances, 512MB RAM |
| **Cloud SQL** | PostgreSQL 16 managed | europe-west1, db-f1-micro (dev), db-custom-1-3840 (prod) |
| **Cloud Storage** | File uploads (presentations) | europe-west1, Standard class, 50MB max object |
| **Secret Manager** | JWT secrets, DB password | Auto-injected into Cloud Run env |
| **Cloud Build** | CI/CD pipeline | Triggered by GitHub push to main |
| **Artifact Registry** | Docker image storage | europe-west1 |

### 3.2 Network Topology

```
Internet
    │
    ▼
Cloud Load Balancer (HTTPS, managed SSL)
    │
    ├──→ Cloud Run: arbitr-web (/*.*)
    │         │
    │         └──→ (client-side fetch to API)
    │
    └──→ Cloud Run: arbitr-api (/api/*.*)
              │
              ├──→ Cloud SQL (private IP, VPC connector)
              └──→ Cloud Storage (signed URLs)
```

### 3.3 Environment Variables

**Cloud Run — API:**
```
DATABASE_URL          → from Secret Manager (Cloud SQL connection string)
JWT_SECRET            → from Secret Manager
JWT_REFRESH_SECRET    → from Secret Manager
GCS_BUCKET            → arbitr-uploads-prod
PORT                  → 3001
NODE_ENV              → production
CORS_ORIGIN           → https://arbitr-web-xxxxx.run.app
```

**Cloud Run — Web:**
```
NEXT_PUBLIC_API_URL   → https://arbitr-api-xxxxx.run.app
NODE_ENV              → production
```

## 4. Authentication Flow

```
┌──────────┐  POST /auth/{role}    ┌──────────┐  verify code   ┌──────┐
│  Client   │ ────────────────────→│  Fastify  │ ─────────────→│  DB  │
│ (browser) │                      │   API     │ ←─────────────│      │
│           │ ←────────────────────│           │  bcrypt match  └──────┘
│           │  { accessToken,      └──────────┘
│           │    refreshToken }
│           │
│  Zustand  │  stores JWT in memory (NOT localStorage)
│  store    │
│           │  Authorization: Bearer <accessToken>
│           │ ────────────────────→ All subsequent requests
└──────────┘
```

### Token Lifecycle
- Access token: 15 min TTL, contains `{ sub, role, sessionId, name }`
- Refresh token: 7 day TTL, stored in DB, rotation on use
- On 401: client calls `POST /auth/refresh` automatically via api-client interceptor

### Auth Strategy Pattern (SSO-ready)
```typescript
interface AuthStrategy {
  name: string;
  authenticate(credentials: unknown): Promise<AuthPayload>;
}

class AuthStrategyRegistry {
  private strategies: Map<string, AuthStrategy>;
  register(strategy: AuthStrategy): void;
  resolve(name: string): AuthStrategy;
}

// v1: CodeStrategy (codes in DB, bcrypt)
// v2: OIDCStrategy (Microsoft Entra ID)
// v2: SAMLStrategy (legacy IdP)
```

## 5. Data Model (Prisma)

### Entity Relationship Diagram

```
Session (1) ──→ (*) Criterion
Session (1) ──→ (*) Evaluator
Session (1) ──→ (*) Team
Session (1) ──→ (*) FormField
Session (1) ──→ (*) Project
Session (1) ──→ (*) Quadrant

Team (1) ──→ (0..1) Project       ← one submission max

Project (1) ──→ (*) Score
Evaluator (1) ──→ (*) Score
Criterion (1) ──→ (*) Score

Score: @@unique([evaluatorId, projectId, criterionId])  ← upsert safe
```

### Key Constraints
- `Team.code` + `Team.sessionId` → unique (no duplicate codes per session)
- `Evaluator.code` + `Evaluator.sessionId` → unique
- `Project.teamId` → unique (one project per team, enforced at DB level)
- All codes stored as bcrypt hashes

## 6. API Layer Design

### Route Organization
```
/health                          → public
/auth/*                          → public (rate-limited: 10/15min/IP)
/sessions/*                      → ADMIN
/sessions/:id/projects           → ADMIN, EVALUATOR (read) / TEAM (create)
/sessions/:id/scores/computed    → ADMIN always / EVALUATOR only if CLOSED
/scores/mine                     → EVALUATOR (own scores only)
/scores/:evalId/:projId          → EVALUATOR (owner only, upsert)
/sessions/:id/export/*           → ADMIN only
```

### Middleware Chain
```
Request → CORS → Helmet → Rate Limit → JWT Verify → Role Guard → Route Handler
```

### Validation Pattern
```typescript
// packages/validation/src/session.ts
export const createSessionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  adminCode: z.string().min(4),
  // ...
});

// apps/api/src/routes/sessions.ts
fastify.post('/sessions', {
  preValidation: [fastify.authenticate, fastify.requireRole('ADMIN')],
  schema: { body: zodToJsonSchema(createSessionSchema) },
}, async (request, reply) => {
  const data = createSessionSchema.parse(request.body);
  // ...
});
```

## 7. Frontend Architecture

### State Management
```
Zustand (auth-store)
  ├── accessToken (in memory only)
  ├── refreshToken (in memory only)
  ├── user: { sub, role, sessionId, name }
  ├── login(role, credentials)
  ├── logout()
  └── refresh()

TanStack Query (server state)
  ├── useSession(id)
  ├── useProjects(sessionId)
  ├── useScores(sessionId)
  ├── useComputedScores(sessionId)
  └── mutation hooks with optimistic updates
```

### Page Routing
```
/                              → Landing (3 portal cards)
/admin                         → Admin login
/admin/sessions                → Session list
/admin/sessions/[id]           → Session config (7 tabs)
/evaluate                      → Evaluator login
/evaluate/[sessionId]          → Project list + scoring
/evaluate/[sessionId]/[projId] → Scoring form
/submit                        → Team login
/submit/[sessionId]            → Submission form
/results/[sessionId]           → Results (matrix, ranking, evaluators)
```

### Component Hierarchy
```
Layout
├── Header (role badge, session name, logout)
├── Sidebar (nav by portal)
└── Content
    ├── Admin
    │   ├── SessionList
    │   ├── SessionConfig (Tabs: General, Teams, Criteria, Evaluators, Form, Quadrants, Preview)
    │   └── ExportButton
    ├── Evaluate
    │   ├── ProjectList (cards + progress bar)
    │   └── ScoringForm (criteria grid + comment + submit)
    ├── Submit
    │   ├── SubmissionForm (dynamic fields + file upload)
    │   └── Confirmation
    └── Results
        ├── MatrixTab (recharts scatter plot)
        ├── RankingTab (table with medals)
        └── EvaluatorsTab (progress per evaluator)
```

## 8. Scoring Engine (`packages/scoring`)

### Core Functions

```typescript
// Pure functions — no DB, no side effects, 100% test coverage

interface CriterionScore {
  criterionId: string;
  axis: 'X' | 'Y';
  weight: number;        // percentage (e.g. 25)
  values: number[];      // one value per evaluator who scored
}

interface ProjectScores {
  projectId: string;
  scoreX: number;        // weighted average on X axis
  scoreY: number;        // weighted average on Y axis
  scoreGlobal: number;   // (scoreX + scoreY) / 2
  quadrant: string;      // position key
  evaluatorCount: number;
}

function computeAxisScore(criteria: CriterionScore[]): number;
// For each criterion: avg(values) * weight / 100
// Sum all → scoreAxis
// scoreAxis = Σ(avg(c_i.values) × c_i.weight) / Σ(c_i.weight)

function computeProjectScores(
  xCriteria: CriterionScore[],
  yCriteria: CriterionScore[]
): { scoreX: number; scoreY: number; scoreGlobal: number };

function assignQuadrant(
  scoreX: number,
  scoreY: number,
  thresholdX: number,
  thresholdY: number
): 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

function computeRanking(projects: ProjectScores[]): RankedProject[];
// Sort by scoreGlobal DESC, assign rank 1..N
```

### Precision
- All intermediate calculations use native JS floats
- Final display: 2 decimal places (rounding at display layer, not computation)

## 9. Security Architecture

### Defense Layers

| Layer | Implementation |
|---|---|
| **Transport** | HTTPS enforced (Cloud Run default), HSTS header |
| **CORS** | `@fastify/cors` — explicit origin whitelist |
| **Headers** | `@fastify/helmet` — CSP, X-Frame-Options, X-Content-Type-Options |
| **Rate limit** | `@fastify/rate-limit` — 10 req/15min/IP on `/auth/*` |
| **Input validation** | Zod schemas on 100% of API inputs |
| **Auth** | JWT Bearer tokens, bcrypt hashed codes, no cookies |
| **Authorization** | Role-based middleware, session status gates |
| **Data isolation** | Evaluator blindness enforced at query level |
| **Secrets** | GCP Secret Manager, never in code/env files committed |
| **Upload** | File type validation, 50MB limit, signed URLs for access |

### Evaluator Blindness Enforcement
```
GET /sessions/:id/scores/computed
  └── middleware: requireRole('ADMIN') OR (requireRole('EVALUATOR') AND session.status === 'CLOSED')

GET /scores/mine
  └── middleware: requireRole('EVALUATOR')
  └── query: WHERE evaluatorId = jwt.sub  ← ONLY own scores

PUT /scores/:evalId/:projId
  └── middleware: requireRole('EVALUATOR') AND evalId === jwt.sub  ← can't write for others
```

## 10. CI/CD Pipeline

### GitHub Actions — CI (on PR)

```yaml
# .github/workflows/ci.yml
jobs:
  lint-typecheck:
    - pnpm install --frozen-lockfile
    - pnpm lint
    - pnpm typecheck          # tsc --noEmit all packages

  test-unit:
    - pnpm test               # Vitest
    needs: lint-typecheck

  test-e2e:
    services: [postgres:16]
    - pnpm db:migrate
    - pnpm db:seed
    - pnpm build
    - pnpm test:e2e           # Playwright
    needs: test-unit
```

### GitHub Actions — Deploy (on push to main)

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    - Authenticate to GCP (Workload Identity Federation)
    - Build Docker images (api + web)
    - Push to Artifact Registry (europe-west1-docker.pkg.dev)
    - Deploy to Cloud Run (api then web)
    - Run Prisma migrations against Cloud SQL
    - Smoke test: curl /health
```

### Docker Build Strategy

```dockerfile
# Dockerfile pattern (both api and web)
FROM node:20-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:api       # or build:web

FROM base AS runner
COPY --from=builder /app/apps/api/dist ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "app.js"]
```

## 11. Implementation Phases

### Phase 1 — Monorepo & Foundations
**Goal**: Scaffold compiles, DB runs, `/health` responds.

| Task | Details |
|---|---|
| Init Turborepo + pnpm workspaces | `turbo.json`, `pnpm-workspace.yaml` |
| Scaffold `apps/api` | Fastify + plugins (prisma, jwt, cors, helmet, rate-limit) |
| Scaffold `packages/types` | Enums, DTOs, JWTPayload interface |
| Scaffold `packages/validation` | Zod schemas for all entities |
| Scaffold `packages/scoring` | `computeAxisScore`, `assignQuadrant` + Vitest tests |
| Prisma schema + migration | All models from PRD section 4.5 |
| Seed script | Hackathon IA Club Med 2025 + generic example |
| Docker Compose | PostgreSQL 16 for local dev |
| `GET /health` | Returns `{ status, db, version }` |

### Phase 2 — Auth v1 (Codes)
**Goal**: 3 roles can authenticate and get JWT.

| Task | Details |
|---|---|
| `CodeStrategy` | bcrypt verify against DB |
| `AuthStrategyRegistry` | Strategy pattern scaffold |
| Auth routes | `POST /auth/admin`, `/auth/evaluator`, `/auth/team` |
| Refresh + logout | `POST /auth/refresh`, `POST /auth/logout` |
| JWT middleware | `authenticate` + `requireRole` decorators |
| Unit tests | Valid/invalid codes, token decode, role guard |

### Phase 3 — Admin CRUD
**Goal**: Full session configuration via API.

| Task | Details |
|---|---|
| Sessions CRUD | GET, POST, PATCH, DELETE + close/reopen |
| Criteria CRUD | With weight sum validation (100% per axis) |
| Evaluators CRUD | With auto code generation |
| Teams CRUD | With auto code generation |
| FormFields CRUD | Dynamic field config |
| Quadrants CRUD | 4 per session, position-based |

### Phase 4 — Submitters (Porteurs)
**Goal**: Teams can submit projects with file upload.

| Task | Details |
|---|---|
| `POST /sessions/:id/projects` | Anti-duplicate (409 if team already submitted) |
| File upload | `POST /projects/:id/upload` → Cloud Storage |
| Validation | Zod on formData, file type/size validation |

### Phase 5 — Evaluators + Scoring
**Goal**: Full scoring workflow, computed results.

| Task | Details |
|---|---|
| `PUT /scores/:evalId/:projId` | Upsert scores for all criteria |
| `GET /scores/mine` | Own scores only |
| `GET /sessions/:id/scores/computed` | Aggregated weighted scores |
| Auto-save | Debounce support via upsert |
| Access control | Blindness + CLOSED gate enforced |

### Phase 6 — Frontend
**Goal**: Complete end-to-end UI.

| Task | Details |
|---|---|
| Next.js scaffold | App Router, Tailwind, shadcn/ui init |
| `api-client.ts` | Typed fetch with JWT interceptor + auto-refresh |
| `auth-store.ts` | Zustand store |
| Landing page | 3 portal cards |
| Admin portal | Session list + 7-tab config |
| Evaluator portal | Project list + scoring form |
| Submitter portal | Dynamic form + file upload |
| Results portal | Matrix (recharts) + ranking table + evaluator progress |

### Phase 7 — Export, Polish & Deploy
**Goal**: Production-ready on GCP.

| Task | Details |
|---|---|
| Export XLSX | 3 sheets (ranking, detail, matrix) via exceljs |
| Export CSV | Aggregated scores |
| Error boundaries | Toast notifications (sonner), loading skeletons |
| Playwright E2E | Full flow: Admin → Submit → Evaluate → Results |
| GCP infra setup | Cloud Run, Cloud SQL, Storage, Secret Manager |
| GitHub Actions | CI + deploy pipelines |
| Custom domain (optional) | Cloud Run domain mapping |

## 12. GCP Project Setup Checklist

```bash
# 1. Create dedicated GCP project
gcloud projects create arbitr-prod --name="Arbitr"
gcloud config set project arbitr-prod

# 2. Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com

# 3. Create Artifact Registry repo
gcloud artifacts repositories create arbitr \
  --repository-format=docker \
  --location=europe-west1

# 4. Create Cloud SQL instance
gcloud sql instances create arbitr-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --root-password=<generated>

gcloud sql databases create arbitr --instance=arbitr-db

# 5. Create Cloud Storage bucket
gcloud storage buckets create gs://arbitr-uploads-prod \
  --location=europe-west1

# 6. Create secrets
echo -n "<value>" | gcloud secrets create jwt-secret --data-file=-
echo -n "<value>" | gcloud secrets create jwt-refresh-secret --data-file=-
echo -n "<value>" | gcloud secrets create db-password --data-file=-

# 7. Create VPC connector (for Cloud Run → Cloud SQL private IP)
gcloud compute networks vpc-access connectors create arbitr-vpc \
  --region=europe-west1 \
  --range=10.8.0.0/28

# 8. GitHub → GCP Workload Identity Federation (for CI/CD)
# (configured via Terraform in infra/)
```

## 13. Key Technical Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo tool | Turborepo + pnpm | Fast, built-in caching, pnpm saves disk space |
| Backend framework | Fastify (not Express) | 2x faster, TypeScript-first, plugin ecosystem |
| ORM | Prisma | Type-safe queries, migration versioning, good DX |
| Frontend meta-framework | Next.js 14 App Router | Industry standard, SSR-capable (used as SPA client here) |
| Auth storage | Zustand in-memory (not localStorage) | XSS-safe, cleared on tab close |
| Scoring isolation | Separate `packages/scoring` | Testable, reusable, no side effects |
| File upload storage | GCP Cloud Storage (not DB blobs) | Scalable, CDN-ready, signed URLs |
| Deploy platform | GCP Cloud Run | Serverless containers, auto-scaling, pay-per-use |
| DB hosting | Cloud SQL managed | Automated backups, patching, private networking |
| CI/CD | GitHub Actions | Native GitHub integration, free for public repos |
| CSS framework | Tailwind + shadcn/ui | Utility-first, accessible components, consistent design |
| State management | TanStack Query + Zustand | Server state vs client state separation |
