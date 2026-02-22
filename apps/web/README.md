# Arbitr Web Frontend

Next.js 14 frontend for the Arbitr project selection platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Language**: TypeScript (strict mode)

## Features

- 🎨 **Multi-portal architecture**:
  - Admin portal for session management
  - Evaluator portal for project scoring
  - Team portal for project submission
  - Public results view with matrix visualization

- 🔐 **JWT-based authentication**:
  - Separate login flows per role
  - Automatic token refresh on 401
  - Memory-only token storage (no localStorage)

- 🎯 **Clean architecture**:
  - Pure API client (no Server Actions)
  - Shared types/validation with backend
  - Optimistic UI updates
  - Responsive design

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (portals)/         # Protected portal routes
│   │   ├── admin/         # Admin dashboard
│   │   ├── evaluate/      # Evaluator interface
│   │   └── submit/        # Team submission
│   └── results/           # Public results view
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth-guard.tsx    # Auth protection wrapper
│   └── login-form.tsx    # Shared login component
└── lib/                  # Utilities and stores
    ├── api-client.ts     # Typed fetch wrapper
    ├── auth-store.ts     # Zustand auth state
    └── query-provider.tsx # React Query setup
```

## Development

```bash
# Start dev server (from monorepo root)
pnpm dev:web

# Build for production
pnpm build:web

# Type checking
pnpm typecheck
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Key Design Decisions

1. **No Server Actions**: Frontend is a pure API client
2. **Memory-only auth**: Tokens stored in Zustand, not localStorage
3. **Automatic token refresh**: Handled transparently in api-client
4. **Role-based routing**: AuthGuard component enforces access
5. **Tailwind v4**: Using CSS-based configuration (no config file)

## UI Components

Using shadcn/ui for consistent, accessible components:
- Button, Card, Input, Label, Badge, Tabs
- Toast notifications via Sonner
- Custom color palette (blue/slate theme)

## Routing Structure

- `/` - Landing page with portal selection
- `/admin` - Admin login → `/admin/sessions`
- `/evaluate` - Evaluator login → `/evaluate/[sessionId]`
- `/submit` - Team login → `/submit/[sessionId]`
- `/results/[sessionId]` - Public results (when session closed)