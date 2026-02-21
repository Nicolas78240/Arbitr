# ⚖️ Arbitr — Product Requirements Document

> **Version** 2.0 · **Date** Février 2026
> **Auteur** Nicolas Caussin — CTO / Head of Engineering, Club Med
> **Statut** Draft — Pour développement par Claude Code
> **Stack** Next.js 14 (front) · Node.js / Fastify (back) · Prisma · PostgreSQL
> **Référence** Prototype React : `hackathon-eval.jsx` (Claude Artifacts)

---

## Table des matières

1. [Executive Summary](#1-executive-summary)
2. [Contexte & Objectifs](#2-contexte--objectifs)
3. [Personas & User Stories](#3-personas--user-stories)
4. [Architecture Technique](#4-architecture-technique)
5. [API Routes](#5-api-routes)
6. [Logique Métier](#6-logique-métier)
7. [Spécifications Fonctionnelles par Portail](#7-spécifications-fonctionnelles-par-portail)
8. [Exigences Non Fonctionnelles](#8-exigences-non-fonctionnelles)
9. [Plan d'Implémentation](#9-plan-dimplémentation-claude-code)
10. [Definition of Done](#10-definition-of-done)
11. [Appendice](#11-appendice)

---

## 1. Executive Summary

**Arbitr** est une plateforme web de **sélection collective de projets par jury**, configurable à 100% sans développement. Elle permet d'organiser des sessions d'évaluation où un jury indépendant note des projets soumis sur invitation, sur des critères pondérés, et visualise les résultats sous forme de matrice de positionnement.

**Cas d'usage typiques :**

| Contexte | Projets évalués | Jurés |
|---|---|---|
| Hackathon IA | Use cases d'automatisation | Tech Leads, CODIR |
| Comité budgétaire | Initiatives à financer | Directeurs, Finance |
| Sélection R&D | Projets d'innovation | Experts métier, Scientifiques |
| Appel à projets RH | Programmes de formation | DRH, Managers |
| Roadmap produit | Features à prioriser | Product Managers, Clients |

**Problème adressé :** Les processus de sélection reposent encore sur des fichiers Excel partagés, des votes à main levée, ou des outils génériques mal adaptés. Arbitr apporte structure, indépendance des jurés, traçabilité et visualisation sans configuration technique.

| Portail | Rôle |
|---|---|
| **Admin** | Configure la session, les critères, les jurés, les équipes, le formulaire de soumission. |
| **Évaluateurs** | Notent les projets en aveugle via un code personnel. Accèdent aux résultats après clôture. |
| **Porteurs** | Déposent leur projet sur invitation (code d'accès). Une soumission par équipe. |
| **Résultats** | Matrice X/Y configurable, classement pondéré, suivi de progression des évaluateurs. |

> ℹ️ Le prototype fonctionnel est disponible sous forme d'artifact React (`hackathon-eval.jsx`). Ce PRD formalise les exigences pour une implémentation production-grade avec un backend Node.js découplé.

---

## 2. Contexte & Objectifs

### 2.1 Contexte

La première instance d'Arbitr est déployée pour la **Guilde des Dev IA chez Club Med**, qui organise des sessions de sélection de cas d'usage IA à développer lors de Hackathons internes. Ces sessions impliquent 10 à 15 évaluateurs qui doivent noter indépendamment 10 à 20 projets sur 10 critères répartis en deux axes.

La plateforme est conçue dès le départ pour être **réutilisable dans tout contexte de sélection de projets**, sans modification du code : les axes, critères, poids, labels, formulaires de soumission et quadrants sont entièrement configurables par session.

**Limitations du processus actuel (fichier Excel) :**

- Absence d'isolement des notes entre évaluateurs (risque de biais)
- Aucune gestion des soumissions des porteurs de projets
- Visualisation statique, pas de mise à jour en temps réel
- Pas de contrôle d'accès — n'importe qui peut modifier les données
- Reconfiguration manuelle et fastidieuse à chaque nouvelle édition

### 2.2 Objectifs

| Objectif | Critère de succès |
|---|---|
| Aveugle garanti entre évaluateurs | Un évaluateur ne peut jamais voir les notes d'un autre |
| Accès porteurs par invitation | Seules les équipes pré-enregistrées peuvent soumettre |
| Résultats post-clôture uniquement | Matrice et classement visibles seulement après `status=CLOSED` |
| Configuration 100% sans dev | Un admin peut créer une session complète depuis l'UI |
| Calcul pondéré configurable | Poids par critère et axes paramétrables par session |
| Visualisation matrice X/Y | Scatter plot avec quadrants et seuils configurables |
| Généricité | Un même déploiement peut accueillir des sessions de nature radicalement différente |
| SSO-ready | Auth v1 par codes simples, architecture prête pour SAML/OIDC sans refonte |

---

## 3. Personas & User Stories

### 3.1 Personas

| Persona | Description & besoins |
|---|---|
| **Administrateur** | Pilote de la session (DG, CTO, Chef de projet). Configure entièrement la session, gère les accès, suit la progression, clôture et accède aux résultats à tout moment. |
| **Évaluateur** | Membre du jury (expert métier, manager, investisseur…). Reçoit un code personnel, note les projets en toute indépendance, accède aux résultats après clôture. |
| **Porteur** | Équipe qui soumet un projet à l'évaluation. Reçoit un code d'accès, dépose son dossier une seule fois via un formulaire configuré par l'admin. |

> **Vocabulaire configurable :** les labels "Évaluateur", "Porteur", "Session" sont des valeurs par défaut. L'admin peut les personnaliser selon son contexte (Juré/Candidat, Investisseur/Startup, Examinateur/Équipe…). Ce paramétrage est géré via le champ `labels` de la session.

### 3.2 User Stories

#### Administrateur

| ID | User Story |
|---|---|
| US-ADM-01 | En tant qu'admin, je veux créer une session avec un nom, une description, un contexte et un code admin afin de paramétrer une nouvelle édition. |
| US-ADM-02 | En tant qu'admin, je veux définir deux axes d'évaluation (X et Y) avec leurs labels, puis y associer des critères pondérés, afin que la somme des poids soit validée à 100% par axe. |
| US-ADM-03 | En tant qu'admin, je veux pré-enregistrer les équipes avec un code d'accès afin de contrôler qui peut soumettre un projet. |
| US-ADM-04 | En tant qu'admin, je veux ajouter des évaluateurs avec leur code personnel afin de leur permettre de noter et d'accéder aux résultats. |
| US-ADM-05 | En tant qu'admin, je veux configurer le formulaire de soumission (champs dynamiques, types, ordre) afin d'adapter la collecte d'information à mon contexte. |
| US-ADM-06 | En tant qu'admin, je veux définir les seuils X et Y et les labels des quadrants afin que la matrice reflète ma grille de décision. |
| US-ADM-07 | En tant qu'admin, je veux clôturer une session afin de verrouiller les soumissions et ouvrir les résultats aux évaluateurs. |
| US-ADM-08 | En tant qu'admin, je veux exporter les résultats en CSV/Excel afin de les partager ou les intégrer dans d'autres outils. |

#### Évaluateur

| ID | User Story |
|---|---|
| US-EVA-01 | En tant qu'évaluateur, je veux me connecter avec mon code personnel afin d'accéder à la liste des projets à noter. |
| US-EVA-02 | En tant qu'évaluateur, je veux noter chaque critère sur l'échelle configurée (0→N) avec un aperçu du score en temps réel. |
| US-EVA-03 | En tant qu'évaluateur, je veux lire le dossier du porteur (champs du formulaire + document joint) sans voir les notes des autres. |
| US-EVA-04 | En tant qu'évaluateur, je veux voir ma progression (x/n projets notés) afin de savoir ce qui reste à évaluer. |
| US-EVA-05 | En tant qu'évaluateur, je veux accéder à la matrice et au classement après clôture de la session. |

#### Porteur

| ID | User Story |
|---|---|
| US-POR-01 | En tant que porteur, je veux m'identifier avec le code de mon équipe afin d'accéder au formulaire de dépôt. |
| US-POR-02 | En tant que porteur, je veux remplir le formulaire de dépôt (champs dynamiques) et uploader un document de présentation. |
| US-POR-03 | En tant que porteur, je veux recevoir une confirmation de soumission avec un ID de référence. |
| US-POR-04 | En tant que porteur, je ne peux soumettre qu'une seule fois — toute nouvelle tentative est bloquée avec un message clair. |

---

## 4. Architecture Technique

### 4.1 Vue d'ensemble

L'application est organisée en **monorepo Turborepo** avec deux applications distinctes :

```
arbitr/
├── apps/
│   ├── api/        → Backend Node.js / Fastify (port 3001)
│   └── web/        → Frontend Next.js 14 App Router (port 3000)
└── packages/
    ├── types/      → Types TypeScript partagés (DTOs, enums)
    ├── validation/ → Schémas Zod partagés front/back
    └── scoring/    → Logique de calcul des scores (pure functions)
```

Le frontend Next.js est un **pure client** : il appelle l'API Fastify via `fetch`. Pas de Server Actions, pas de Route Handlers Next.js — toute la logique métier est dans l'API Node.js.

### 4.2 Stack

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG, routing, DX |
| **Backend** | Node.js + **Fastify** | Performant, TypeScript natif, plugins ecosystem |
| **Langage** | TypeScript strict (partout) | Typage partagé monorepo |
| **ORM** | Prisma + PostgreSQL | Migrations versionnées, type-safe |
| **Auth** | JWT (access + refresh tokens) | Stateless, SSO-ready par design |
| **Upload** | Fastify Multipart + Vercel Blob / S3 | Streaming upload sans buffer mémoire |
| **Validation** | Zod (schémas partagés) | Validation identique front et back |
| **Styles** | Tailwind CSS + shadcn/ui | Cohérence design, composants accessibles |
| **State client** | TanStack Query | Cache, invalidation, optimistic updates |
| **Tests** | Vitest (unit) + Playwright (E2E) | |
| **Monorepo** | Turborepo | Build cache, orchestration tasks |
| **Déploiement** | Docker Compose (dev) · Render / Railway / VPS (prod) | |

### 4.3 Authentification — Conception SSO-ready

#### Principe

L'auth est organisée autour d'une **abstraction de stratégie** : en v1, on vérifie un code en base. En v2, on branche un provider OIDC/SAML sans toucher aux routes protégées ni aux tokens.

```
Client → POST /auth/login { strategy, credentials }
            ↓
       AuthStrategyRegistry
            ↓
   ┌────────────────────────┐
   │  v1 : CodeStrategy     │  vérifie code en DB → identité
   │  v2 : OIDCStrategy     │  valide token Microsoft Entra
   │  v2 : SAMLStrategy     │  valide assertion SAML
   └────────────────────────┘
            ↓
       Payload unifié { sub, role, sessionId, name }
            ↓
       JWT access token (15min) + refresh token (7j)
```

#### Tokens JWT

```typescript
// Payload identique quelle que soit la stratégie auth
interface JWTPayload {
  sub: string        // userId ou evaluatorId/teamId selon le rôle
  role: 'ADMIN' | 'EVALUATOR' | 'TEAM'
  sessionId: string  // ID de la session Arbitr
  name: string
  iat: number
  exp: number
}
```

#### Auth v1 — Codes simples (à implémenter en Phase 1)

Trois routes de login, une par rôle. Pas de session serveur, pas de cookie — juste un JWT retourné dans le body. Le frontend le stocke en mémoire (`zustand`) et l'envoie en header `Authorization: Bearer`.

```
POST /auth/admin     { adminCode }                  → { accessToken, refreshToken }
POST /auth/evaluator { sessionId, evaluatorCode }   → { accessToken, refreshToken }
POST /auth/team      { sessionId, teamCode }        → { accessToken, refreshToken }
POST /auth/refresh   { refreshToken }               → { accessToken }
POST /auth/logout    (invalide le refresh token)
```

> ✅ **Testable en 30 secondes** : `curl -X POST /auth/evaluator -d '{"sessionId":"xxx","evaluatorCode":"CB001"}'`

#### Auth v2 — SSO Microsoft Entra ID — Architecture prête

Quand le SSO sera activé, on ajoute une route et une stratégie sans modifier le reste :

```
GET  /auth/oidc/login          → redirect vers Entra ID
GET  /auth/oidc/callback       → échange code → JWT interne (même format v1)
GET  /auth/saml/metadata       → metadata SP pour configuration IdP
POST /auth/saml/callback       → valide assertion → JWT interne
```

Le mapping groupe AD → rôle Arbitr se configure via variables d'environnement :

```env
SSO_ADMIN_GROUP="sg-arbitr-admin"
SSO_EVALUATOR_GROUP="sg-arbitr-evaluator"
```

> ⚠️ En v1, ces routes n'existent pas. L'`AuthStrategyRegistry` et la table `User` sont néanmoins créés dès v1 pour accueillir le SSO sans refonte.

### 4.4 Structure des dossiers

```
apps/
├── api/                              ← Node.js / Fastify
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── prisma.ts             ← Plugin Fastify Prisma
│   │   │   ├── jwt.ts                ← Plugin JWT (@fastify/jwt)
│   │   │   ├── cors.ts
│   │   │   ├── multipart.ts          ← Upload fichiers
│   │   │   └── rate-limit.ts
│   │   ├── auth/
│   │   │   ├── strategies/
│   │   │   │   ├── code.strategy.ts  ← Auth v1 (codes)
│   │   │   │   ├── oidc.strategy.ts  ← Auth v2 (OIDC/Entra)
│   │   │   │   └── saml.strategy.ts  ← Auth v2 (SAML)
│   │   │   ├── registry.ts           ← AuthStrategyRegistry
│   │   │   └── routes.ts
│   │   ├── routes/
│   │   │   ├── sessions.ts
│   │   │   ├── criteria.ts
│   │   │   ├── evaluators.ts
│   │   │   ├── teams.ts
│   │   │   ├── fields.ts
│   │   │   ├── projects.ts
│   │   │   ├── scores.ts
│   │   │   └── export.ts
│   │   ├── services/
│   │   │   ├── scoring.service.ts    ← Calcul agrégé (importe @arbitr/scoring)
│   │   │   ├── export.service.ts     ← XLSX / CSV
│   │   │   └── upload.service.ts     ← S3 / Vercel Blob
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts    ← Vérification JWT + rôle
│   │   └── app.ts                    ← Bootstrap Fastify
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── package.json
│
├── web/                              ← Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── (portals)/
│   │   │   │   ├── admin/
│   │   │   │   ├── evaluate/         ← Portail évaluateur
│   │   │   │   ├── submit/           ← Portail porteur
│   │   │   │   └── results/[sessionId]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                   ← shadcn/ui
│   │   │   ├── admin/
│   │   │   ├── evaluate/
│   │   │   └── results/
│   │   ├── lib/
│   │   │   ├── api-client.ts         ← fetch wrapper typé (@arbitr/types)
│   │   │   └── auth-store.ts         ← Zustand : JWT en mémoire
│   │   └── hooks/
│   │       └── use-api.ts            ← TanStack Query wrappers
│   └── package.json
│
packages/
├── types/       ← DTOs partagés (Session, Project, Score, JWTPayload…)
├── validation/  ← Schémas Zod partagés
└── scoring/     ← computeScores(), assignQuadrant() — pure functions testables
```

### 4.5 Schéma de base de données (Prisma)

```prisma
enum SessionStatus { DRAFT  ACTIVE  CLOSED }
enum Axis          { X  Y }
enum FieldType     { TEXT  TEXTAREA  NUMBER  SELECT  EMAIL  URL }

model Session {
  id           String        @id @default(cuid())
  name         String
  description  String?
  status       SessionStatus @default(DRAFT)
  adminCode    String        // Haché bcrypt
  thresholdX   Float         @default(3.5)
  thresholdY   Float         @default(3.5)
  axisLabelX   String        @default("Valeur")      // Ex: "ROI", "Impact métier"
  axisLabelY   String        @default("Maturité")    // Ex: "Faisabilité", "Risque"
  // Labels personnalisables par session
  labelEvaluator String      @default("Évaluateur")  // Ex: "Juré", "Investisseur"
  labelTeam      String      @default("Équipe")      // Ex: "Startup", "Candidat"
  labelProject   String      @default("Projet")      // Ex: "Use case", "Initiative"
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  criteria     Criterion[]
  evaluators   Evaluator[]
  teams        Team[]
  fields       FormField[]
  projects     Project[]
  quadrants    Quadrant[]
}

// Quadrants configurables par session (4 max)
model Quadrant {
  id        String  @id @default(cuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  position  String  // "top-right" | "top-left" | "bottom-right" | "bottom-left"
  label     String  // Ex: "Priorité haute", "À investiguer", "Quick win", "Déprioritiser"
  icon      String  // Emoji ou code icon
  color     String  // Hex color
}

model Criterion {
  id          String    @id @default(cuid())
  sessionId   String
  session     Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  name        String
  description String?
  axis        Axis
  min         Int       @default(0)
  max         Int       @default(5)
  weight      Int       // Poids %, Σ par axe = 100
  order       Int       @default(0)
  scores      Score[]
}

model Evaluator {
  id        String    @id @default(cuid())
  sessionId String
  session   Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  name      String
  code      String    // Haché bcrypt
  scores    Score[]
  @@unique([sessionId, code])
}

model Team {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  name      String
  code      String   // Haché bcrypt
  project   Project?
  @@unique([sessionId, code])
}

model FormField {
  id          String    @id @default(cuid())
  sessionId   String
  session     Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  label       String
  placeholder String?
  type        FieldType
  required    Boolean   @default(false)
  options     String[]  @default([])
  order       Int       @default(0)
}

model Project {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id])
  teamId      String   @unique
  team        Team     @relation(fields: [teamId], references: [id])
  name        String
  number      Int
  formData    Json     // { fieldId: value }
  fileUrl     String?
  fileName    String?
  submittedAt DateTime @default(now())
  scores      Score[]
}

model Score {
  id            String    @id @default(cuid())
  evaluatorId   String
  evaluator     Evaluator @relation(fields: [evaluatorId], references: [id])
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  criterionId   String
  criterion     Criterion @relation(fields: [criterionId], references: [id])
  value         Int
  comment       String?   // Commentaire global par projet/évaluateur
  submittedAt   DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@unique([evaluatorId, projectId, criterionId])
}

// Prête pour migration SSO v2 (non utilisée en v1)
model User {
  id         String   @id @default(cuid())
  externalId String?  @unique  // sub OIDC ou nameID SAML
  email      String?  @unique
  name       String?
  createdAt  DateTime @default(now())
}
```

---

## 5. API Routes (Fastify)

Toutes les routes retournent `Content-Type: application/json`. Format d'erreur uniforme :

```json
{ "error": "UNAUTHORIZED", "message": "Invalid evaluator code", "statusCode": 401 }
```

### 5.1 Auth

| Method | Route | Auth requise | Description |
|---|---|---|---|
| `POST` | `/auth/admin` | — | `{ adminCode }` → `{ accessToken, refreshToken }` |
| `POST` | `/auth/evaluator` | — | `{ sessionId, evaluatorCode }` → `{ accessToken, refreshToken }` |
| `POST` | `/auth/team` | — | `{ sessionId, teamCode }` → `{ accessToken, refreshToken }` |
| `POST` | `/auth/refresh` | — | `{ refreshToken }` → `{ accessToken }` |
| `POST` | `/auth/logout` | JWT | Invalide le refresh token |

> En v2 s'ajoutent : `GET /auth/oidc/login`, `GET /auth/oidc/callback`, `GET /auth/saml/metadata`, `POST /auth/saml/callback`

### 5.2 Sessions

| Method | Route | Rôle | Description |
|---|---|---|---|
| `GET` | `/sessions` | ADMIN | Liste toutes les sessions |
| `POST` | `/sessions` | ADMIN | Créer une session |
| `GET` | `/sessions/:id` | ADMIN, EVALUATOR | Détails d'une session |
| `PATCH` | `/sessions/:id` | ADMIN | Modifier (name, seuils, labels, status…) |
| `DELETE` | `/sessions/:id` | ADMIN | Supprimer + cascade |
| `POST` | `/sessions/:id/close` | ADMIN | `status = CLOSED` |
| `POST` | `/sessions/:id/reopen` | ADMIN | `status = ACTIVE` |

### 5.3 Ressources de configuration

| Method | Route | Rôle | Description |
|---|---|---|---|
| `GET/POST` | `/sessions/:id/criteria` | ADMIN | Lister / créer critères |
| `PATCH/DELETE` | `/criteria/:id` | ADMIN | Modifier / supprimer |
| `GET/POST` | `/sessions/:id/evaluators` | ADMIN | Lister / créer évaluateurs |
| `PATCH/DELETE` | `/evaluators/:id` | ADMIN | Modifier / supprimer |
| `GET/POST` | `/sessions/:id/teams` | ADMIN | Lister / créer équipes |
| `PATCH/DELETE` | `/teams/:id` | ADMIN | Modifier / supprimer |
| `GET/POST` | `/sessions/:id/fields` | ADMIN | Lister / créer champs formulaire |
| `PATCH/DELETE` | `/fields/:id` | ADMIN | Modifier / supprimer |
| `GET/POST` | `/sessions/:id/quadrants` | ADMIN | Configurer les 4 quadrants |
| `PATCH` | `/quadrants/:id` | ADMIN | Modifier label/icône/couleur |

### 5.4 Projets

| Method | Route | Rôle | Description |
|---|---|---|---|
| `GET` | `/sessions/:id/projects` | ADMIN, EVALUATOR | Liste des projets |
| `POST` | `/sessions/:id/projects` | TEAM | Soumettre un projet (1 fois) |
| `GET` | `/projects/:id` | ADMIN, EVALUATOR | Détails + dossier |
| `POST` | `/projects/:id/upload` | TEAM | Upload fichier → `{ fileUrl }` |

### 5.5 Scores

| Method | Route | Rôle | Description |
|---|---|---|---|
| `GET` | `/sessions/:id/scores` | ADMIN | Scores bruts |
| `GET` | `/sessions/:id/scores/computed` | ADMIN, EVALUATOR (si CLOSED) | Scores agrégés pondérés |
| `PUT` | `/scores/:evaluatorId/:projectId` | EVALUATOR (propriétaire) | Soumettre / mettre à jour |
| `GET` | `/scores/mine` | EVALUATOR | Ses propres scores |

### 5.6 Export & Santé

| Method | Route | Rôle | Description |
|---|---|---|---|
| `GET` | `/sessions/:id/export/csv` | ADMIN | Export CSV |
| `GET` | `/sessions/:id/export/xlsx` | ADMIN | Export Excel (3 feuilles) |
| `GET` | `/health` | — | `{ status: "ok", db: "ok", version }` |

---

## 6. Logique Métier

### 6.1 Calcul des scores

Implémenté dans `packages/scoring/` — pure functions sans dépendances externes.

**Score par axe** — Moyenne pondérée des notes de tous les évaluateurs sur les critères de cet axe :

```
scoreX(projet) = Σ( moy_évaluateurs(critère_i) × poids_i ) / Σ(poids_i)   pour i ∈ critères axe X
```

**Score global :**

```
scoreGlobal = (scoreX + scoreY) / 2
```

### 6.2 Quadrants configurables

Les 4 quadrants sont définis par leur position dans la matrice (seuil X / seuil Y) et leurs métadonnées sont 100% configurables par session :

| Position | Défaut Club Med | Exemple budgétaire | Exemple R&D |
|---|---|---|---|
| X≥seuil, Y≥seuil | 🏆 Priorité haute | 💰 Financer maintenant | 🚀 Lancer |
| X≥seuil, Y<seuil | 📋 Backlog | 📅 Planifier | 🔬 Investiguer |
| X<seuil, Y≥seuil | 🔧 Self-service | ⚙️ Outiller | 🛠 Pré-requis |
| X<seuil, Y<seuil | ⏸ Hors priorité | ❌ Rejeter | 💡 Idéation |

### 6.3 Règles d'accès

| Ressource | Admin | Évaluateur (actif) | Évaluateur (post-clôture) | Porteur |
|---|:---:|:---:|:---:|:---:|
| Config session | ✅ R/W | ❌ | ❌ | ❌ |
| Liste projets | ✅ R | ✅ R | ✅ R | ❌ |
| Dossier projet | ✅ R | ✅ R | ✅ R | ❌ |
| Ses propres notes | ✅ R/W | ✅ R/W | ✅ R | ❌ |
| Notes des autres | ✅ R | ❌ | ✅ R | ❌ |
| Résultats / matrice | ✅ R | ❌ | ✅ R | ❌ |
| Soumission projet | ✅ | ❌ | ❌ | ✅ (1×) |
| Export CSV/XLSX | ✅ | ❌ | ❌ | ❌ |

---

## 7. Spécifications Fonctionnelles par Portail

### 7.1 Page d'accueil & sélection de portail

- Landing page avec 3 cards cliquables (Admin, Évaluer, Soumettre)
- Les labels des cards s'adaptent selon les `labelEvaluator` / `labelTeam` de la session sélectionnée
- Aperçu des sessions actives avec statut, compteurs projets/évaluateurs/notes
- Navigation vers les résultats depuis la sidebar
- Responsive mobile

### 7.2 Portail Admin

#### 7.2.1 Authentification

- Formulaire de connexion avec `adminCode` (global, pas par session)
- JWT stocké en mémoire (Zustand) — pas de cookie, pas de localStorage
- Accès à toutes les sessions depuis un même compte admin

#### 7.2.2 Gestion des sessions

- Liste des sessions avec statut (`DRAFT` / `ACTIVE` / `CLOSED`), compteurs, actions rapides
- CRUD complet avec confirmation sur suppression
- Bouton clôture avec dialog + mention des impacts (soumissions bloquées, résultats ouverts)
- Indicateur de complétion (x/n évaluateurs ont noté tous les projets)

#### 7.2.3 Configuration — 7 onglets

| Onglet | Contenu |
|---|---|
| **Général** | Nom, description, statut, date, code admin, labels personnalisés (évaluateur/porteur/projet) |
| **Équipes** | Liste des porteurs invités, code d'accès, ajout/suppression, génération automatique de code |
| **Critères** | Axe X/Y, nom, description, min/max, poids % — validation Σ=100% par axe en temps réel |
| **Évaluateurs** | Nom, code d'accès, génération auto du code |
| **Formulaire** | Champs dynamiques (text/textarea/number/select/email/url), requis/optionnel, placeholder |
| **Quadrants** | Label, icône, couleur des 4 quadrants + seuils X et Y + labels des axes |
| **Aperçu** | Prévisualisation de la matrice avec les seuils configurés |

#### 7.2.4 Export

- `.xlsx` : feuille classement + feuille détail (notes par évaluateur par critère) + feuille matrice
- `.csv` : scores agrégés, format simple

### 7.3 Portail Évaluateur

#### 7.3.1 Connexion

- Sélection session (sessions `ACTIVE` + `CLOSED`)
- Saisie du code évaluateur → JWT
- Sessions `CLOSED` : accès résultats uniquement

#### 7.3.2 Liste des projets

- Carte par projet : numéro, nom, équipe, statut (Noté / À noter)
- Barre de progression globale (x/n projets notés)
- Tri : non notés en premier par défaut

#### 7.3.3 Formulaire de notation

- Dossier du porteur affiché en haut (champs formulaire + lien fichier)
- Critères organisés en 2 colonnes (axe X / axe Y) avec leurs labels configurés
- Sélection de note par boutons 0→N avec feedback couleur temps réel
- Score prévisualisé par axe (calcul côté client via `packages/scoring`)
- Commentaire global optionnel (un seul par projet/évaluateur)
- Bouton Valider activé uniquement si tous les critères renseignés
- Auto-save brouillon (debounce 1s → `PUT /scores`)

#### 7.3.4 Résultats (session clôturée)

- Accès matrice et classement après clôture uniquement
- Lecture seule

### 7.4 Portail Porteur

#### 7.4.1 Connexion

- Sessions `ACTIVE` uniquement
- Saisie du code équipe → vérification anti-doublon → JWT team
- Si soumission déjà faite → message bloquant avec ID de référence existant

#### 7.4.2 Formulaire de dépôt

- Nom du projet (champ fixe, toujours en tête)
- Champs dynamiques selon configuration admin (ordre configurable)
- Upload document : drag & drop ou clic, `.pptx` / `.pdf` / `.docx`, max 50 Mo
- Validation Zod côté client ET serveur

#### 7.4.3 Confirmation

- ID de référence + nom de l'équipe
- Message contextuel : les résultats seront accessibles après clôture
- Re-soumission bloquée à tout moment

### 7.5 Portail Résultats

#### 7.5.1 Auth gate

- Session `ACTIVE` : code admin uniquement (mention explicite)
- Session `CLOSED` : code admin OU code évaluateur
- Rôle connecté affiché dans le header

#### 7.5.2 Onglet Matrice

- Scatter plot (recharts) avec seuils et labels d'axes issus de la config session
- 4 zones de couleur dynamiques selon les couleurs configurées pour chaque quadrant
- Lignes de seuil en pointillés
- Tooltip au survol : nom projet, scoreX, scoreY, score global, nb évaluateurs
- Légende quadrants avec labels configurés

#### 7.5.3 Onglet Classement

- Tableau trié par score global décroissant
- 🥇🥈🥉 pour top 3, puis rang numérique
- Colonnes : rang, projet, scoreX (axe configuré), scoreY (axe configuré), score global, nb évaluateurs, quadrant
- Export CSV depuis cet onglet

#### 7.5.4 Onglet Évaluateurs

- Progression par évaluateur : nb projets notés / total
- Visible intégralement pour l'admin ; l'évaluateur voit sa propre progression uniquement

---

## 8. Exigences Non Fonctionnelles

### 8.1 Sécurité

- JWT access token 15 min, refresh token 7 jours (rotation)
- Codes d'accès hachés bcrypt en base — jamais stockés en clair, jamais loggués
- Rate limiting (`@fastify/rate-limit`) : 10 tentatives / 15 min / IP sur `/auth/*`
- CORS strict (`@fastify/cors`) — origines explicites
- Headers sécurité (`@fastify/helmet`) : CSP, HSTS, X-Frame-Options
- Validation Zod sur 100% des inputs API
- Audit log : `submittedAt` / `updatedAt` sur chaque score

### 8.2 Performance

- Temps de réponse API < 200ms (p95) hors calculs agrégés
- `/scores/computed` < 500ms avec 15 évaluateurs × 20 projets × 10 critères
- Pagination sur les listes de projets > 20 éléments
- Cache des scores agrégés (invalidé à chaque `PUT /scores`)

### 8.3 UX / Accessibilité

- Responsive mobile first (sm/md/lg)
- Optimistic updates via TanStack Query
- Toast notifications (sonner)
- Messages d'erreur explicites et actionnables
- WCAG AA : contraste, navigation clavier, ARIA labels

### 8.4 Fiabilité

- Transactions Prisma pour opérations multi-tables
- `@@unique([evaluatorId, projectId, criterionId])` → upsert safe sur les scores
- Retry upload S3 (max 3 tentatives, backoff exponentiel)
- Migrations Prisma versionnées

---

## 9. Plan d'Implémentation (Claude Code)

> ✅ Chaque phase produit une version fonctionnable et testable de façon autonome.

| Phase | Contenu & Livrables |
|---|---|
| **Phase 1 — Monorepo & Foundations** | Scaffold Turborepo · Fastify avec plugins (jwt, cors, helmet, rate-limit) · Prisma schema + migrations · `packages/types` et `packages/scoring` · Seed script · **Livrable : `GET /health` répond, DB peuplée, types compilent** |
| **Phase 2 — Auth v1 (codes)** | `CodeStrategy` + `AuthStrategyRegistry` · 3 routes login + refresh + logout · Middleware JWT · Tests unitaires · **Livrable : 3 rôles peuvent s'authentifier** |
| **Phase 3 — Admin CRUD** | Routes sessions, criteria, evaluators, teams, fields, quadrants · Validation Zod · **Livrable : session complète configurable via API** |
| **Phase 4 — Porteurs** | Route projet POST + anti-doublon · Upload multipart → S3/Blob · **Livrable : une équipe peut soumettre avec fichier** |
| **Phase 5 — Évaluateurs** | Routes scores (PUT upsert) · `/scores/computed` · **Livrable : notation complète, agrégation correcte** |
| **Phase 6 — Frontend** | Next.js scaffold · `api-client.ts` typé · `auth-store.ts` (Zustand) · 4 portails complets · **Livrable : app end-to-end fonctionnelle** |
| **Phase 7 — Export & Polish** | Export XLSX (exceljs) + CSV · Toasts, skeletons, error boundaries · Tests Playwright · **Livrable : production-ready** |

### 9.1 Commandes de démarrage

```bash
# Monorepo
npx create-turbo@latest arbitr --example with-tailwind
cd arbitr

# API (apps/api)
cd apps/api
npm install fastify @fastify/jwt @fastify/cors @fastify/helmet @fastify/rate-limit
npm install @fastify/multipart @fastify/sensible
npm install prisma @prisma/client bcrypt zod
npm install -D @types/bcrypt tsx vitest

# Frontend (apps/web)
cd apps/web
npm install next react react-dom
npm install @tanstack/react-query zustand recharts sonner lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-tabs
npx shadcn@latest init

# Packages partagés
cd packages/scoring    && npm init -y && npm install -D typescript vitest
cd packages/types      && npm init -y && npm install -D typescript
cd packages/validation && npm install zod && npm install -D typescript

# Prisma
cd apps/api && npx prisma init --datasource-provider postgresql
```

### 9.2 Variables d'environnement

```env
# apps/api/.env
DATABASE_URL="postgresql://user:password@localhost:5432/arbitr"
JWT_SECRET="your-256-bit-secret"
JWT_REFRESH_SECRET="another-256-bit-secret"
PORT=3001

# Upload (choisir un)
BLOB_READ_WRITE_TOKEN=""        # Vercel Blob
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET=""

# SSO v2 (laisser vide en v1)
OIDC_CLIENT_ID=""
OIDC_CLIENT_SECRET=""
OIDC_DISCOVERY_URL=""           # https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
SAML_ENTRY_POINT=""
SAML_CERT=""
SSO_ADMIN_GROUP="sg-arbitr-admin"
SSO_EVALUATOR_GROUP="sg-arbitr-evaluator"

# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 9.3 Docker Compose (développement)

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: arbitr
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/arbitr
      JWT_SECRET: dev-secret
      JWT_REFRESH_SECRET: dev-refresh-secret
    depends_on:
      - db

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    depends_on:
      - api

volumes:
  pgdata:
```

---

## 10. Definition of Done

### 10.1 Critères d'acceptation

| Feature | Critère de validation |
|---|---|
| Auth v1 | `curl POST /auth/evaluator` avec code valide → JWT décodable |
| Rate limiting | 11ème tentative en 15 min sur `/auth/*` → 429 |
| Création session | Admin crée session via API → données en DB, quadrants inclus |
| Labels custom | `labelEvaluator="Juré"` → affiché partout dans le frontend |
| Clôture | `status = CLOSED` → soumissions rejetées, résultats ouverts évaluateurs |
| Anti-doublon | 2ème soumission même teamCode → `409 Conflict` |
| Aveugle | `/scores/computed` pendant session ACTIVE → 403 pour un évaluateur |
| Calcul pondéré | `scoreX = Σ(avg(c_i) × poids_i) / ΣPoids` — précision 2 décimales |
| Quadrants config | Changer label/couleur d'un quadrant → reflété immédiatement dans la matrice |
| Auth gate | Session ACTIVE + code évaluateur → 403 · Session CLOSED → 200 |
| Export XLSX | Fichier valide avec 3 feuilles (classement, détail, matrice) |
| Upload | Fichier uploadé → `fileUrl` en DB → accessible depuis le dossier projet |
| Performance | `/scores/computed` < 500ms avec 15×20×10 scores |
| SSO-ready | `AuthStrategyRegistry` reçoit nouvelle stratégie sans toucher aux routes |

### 10.2 Checklist finale

- [ ] Toutes les User Stories US-ADM, US-EVA, US-POR implémentées et testées
- [ ] Tests unitaires `packages/scoring` : `computeScores`, `assignQuadrant` — couverture 100%
- [ ] Tests unitaires `CodeStrategy` : codes valides, invalides, hachage
- [ ] Tests E2E Playwright : flux complet Admin → Porteur → Évaluateur → Résultats
- [ ] Seed script fonctionnel (session Hackathon IA Club Med 2025 + session exemple générique)
- [ ] `README.md` avec setup, Docker Compose, seed, variables d'env
- [ ] Aucun secret commité (`JWT_SECRET`, codes en clair)
- [ ] `tsc --noEmit` sans erreurs dans les 3 packages et les 2 apps
- [ ] `GET /health` retourne 200 avec statut DB

---

## 11. Appendice

### 11.1 Exemple de configuration — Hackathon IA Club Med 2025

Cette configuration sert de seed de référence. Elle illustre un cas d'usage concret d'Arbitr.

**Paramètres de la session :**

| Paramètre | Valeur |
|---|---|
| Nom | Hackathon IA Club Med 2025 |
| Axe X | Valeur Business |
| Axe Y | Maturité du Use Case |
| Seuil X | 3.5 |
| Seuil Y | 3.5 |
| Label évaluateur | Juré |
| Label porteur | Équipe |
| Label projet | Use case |

**Quadrants configurés :**

| Quadrant | Label | Icône | Couleur |
|---|---|---|---|
| X≥3.5, Y≥3.5 | Priorité Hackathon | 🏆 | `#059669` |
| X≥3.5, Y<3.5 | Backlog projet | 📋 | `#3B82F6` |
| X<3.5, Y≥3.5 | Self-service | 🔧 | `#F59E0B` |
| X<3.5, Y<3.5 | Hors priorité | ⏸ | `#94A3B8` |

**Résultats de référence :**

| UC# | Projet | Score Valeur | Score Maturité | Quadrant |
|---|---|:---:|:---:|---|
| UC#13 | Supplier Data Quality | 4.17 | 4.06 | 🏆 Priorité |
| UC#5  | Reception Email | 4.35 | 3.99 | 📋 Backlog |
| UC#10 | Flight Schedule | 4.22 | 3.47 | 📋 Backlog |
| UC#6  | Background Check | 4.09 | 3.18 | 📋 Backlog |
| UC#7  | Language Assessment | 3.68 | 3.13 | 📋 Backlog |
| UC#12 | PULSE | 3.11 | 3.93 | 🔧 Self-service |
| UC#4  | Regulatory Watch | 2.95 | 3.77 | 🔧 Self-service |
| UC#9  | Intelligence Gateway | 2.94 | 3.91 | 🔧 Self-service |
| UC#1  | LDAP Security | 2.77 | 3.22 | ⏸ Hors priorité |
| UC#2  | Strategic Reporting | 2.54 | 2.47 | ⏸ Hors priorité |

### 11.2 Évaluateurs de référence (Seed)

```
CB001  Cédric Baillet
NB002  Nicolas Bresch
QB003  Quentin Briard
NC004  Nicolas Caussin
AC005  Amina Chaabane
SC006  Siddhartha Chatterjee
JD007  Julien Denis
CL008  Caroline Launois-Beaurain
AV009  Armelle Vimont Laurent
SP010  Sophie Parisot Bouelam
FP011  Franck Picabea
YS012  Yoann Spadavecchia
RD013  Richard Douville
```

### 11.3 Critères de référence (Seed)

**Axe X — Valeur Business** (Σ = 100%)

| Critère | Description | Poids |
|---|---|:---:|
| Impact métier | Pain point clair, prioritaire, concret | 25% |
| Viabilité économique | ROI crédible et réaliste | 20% |
| Automatisation | Automatisation bout en bout du processus | 25% |
| Effet différenciant | Transformation visible, effet «whaou» | 15% |
| Cohérence stratégique | Aligné avec les priorités Club Med | 15% |

**Axe Y — Maturité du Use Case** (Σ = 100%)

| Critère | Description | Poids |
|---|---|:---:|
| Qualité du cadrage | Périmètre, objectifs, hypothèses définis | 20% |
| Accessibilité données | Données identifiées, existantes, accessibles | 25% |
| Maturité POC | Livrable concret réalisable en hackathon | 25% |
| Scalabilité technique | Technologies mutualisables, industrialisables | 15% |
| Conformité RGPD | Enjeux confidentialité et RGPD maîtrisés | 15% |

### 11.4 Exemple alternatif — Comité budgétaire

Pour illustrer la généricité d'Arbitr, voici comment une équipe Finance configurerait la même plateforme :

| Paramètre | Valeur |
|---|---|
| Axe X | Retour sur investissement |
| Axe Y | Faisabilité opérationnelle |
| Label évaluateur | Directeur |
| Label porteur | Business Unit |
| Label projet | Initiative |
| Quadrant haut-droit | 💰 Financer (priorité) |
| Quadrant haut-gauche | ⚙️ Outiller d'abord |
| Quadrant bas-droit | 📅 Planifier (moyen terme) |
| Quadrant bas-bas | ❌ Rejeter |

Aucune ligne de code à modifier — uniquement de la configuration via l'interface admin.

### 11.5 Évolution SSO — Roadmap

| Étape | Action | Effort |
|---|---|---|
| **v1 — Maintenant** | Auth codes bcrypt + JWT + `AuthStrategyRegistry` vide | Inclus Phase 2 |
| **v2a — OIDC** | `OIDCStrategy` pour Microsoft Entra ID | ~1 jour |
| **v2b — Mapping rôles** | Groupes AD → rôles Arbitr via `.env` | ~0.5 jour |
| **v2c — Migration** | Lier `User.externalId` aux évaluateurs existants | ~0.5 jour |
| **v3 — SAML** | `SAMLStrategy` pour IdP legacy si nécessaire | ~1 jour |

### 11.6 Références

- Prototype React : `hackathon-eval.jsx` (Claude Artifacts — Février 2026)
- Fichier source original : `Eval_Jury_Hackathon_Version_Partage_e_Sauvegarde.xlsx`
- [Fastify Documentation](https://fastify.dev/docs/latest)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js 14 App Router](https://nextjs.org/docs)
- [Turborepo](https://turbo.build/repo/docs)
- [Microsoft Entra ID — OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)

---

> 📄 **Arbitr** — PRD rédigé avec Claude (Anthropic) en collaboration avec Nicolas Caussin, CTO Club Med. Version 2.0 — Février 2026.
