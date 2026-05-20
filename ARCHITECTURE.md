# RideSnap architecture

## Monorepo layout

```
rideSnap/
├── backend/              NestJS 11 + Prisma + PostgreSQL
│   └── prisma/
│       ├── schema.prisma   ← Prisma schema (NOT at repo root)
│       ├── seed.ts
│       └── migrations/
├── frontend/             React 19 + Vite + TypeScript
├── ridesnap-backend/     Legacy Express + SQLite (no Prisma)
├── packages/shared/      Shared constants
├── docker/               Production Dockerfiles + nginx
├── RUN.md                How to run locally
└── .github/workflows/    CI
```

## Backend (`backend/src`)

- **config/** — env validation (`validateEnv`), pricing
- **common/** — filters, utils
- **infrastructure/** — S3, email, Zebra printer adapters
- **modules/** — feature modules (controller → service → Prisma)
- **prisma/** — DB client module

Global guards: throttling, auth (role-based via `@Roles()`).

## Frontend (`frontend/src`)

- **app/** — `App.tsx`, `routes.tsx`
- **features/** — one folder per staff workflow (auth, photographer, photo-desk, …)
- **shared/** — API client, hooks, UI primitives, types

## Data flow

1. Staff logs in → `POST /api/auth/login` → token in `localStorage`
2. Protected routes send `x-auth-token` on admin/user endpoints
3. Photographer uploads → S3 + Prisma `photos`
4. Counter places order → print queue + optional email/SMS/WhatsApp short link
5. Guest opens `GET /p/:code` (HTML from Nest, not React)

## API documentation

Swagger UI: `http://localhost:5000/api/docs` (enabled in non-production, or `ENABLE_SWAGGER=true`).

Authenticate in Swagger using the **session** API key (`x-auth-token` header) from `POST /api/auth/login`.

## Testing

```bash
npm test                 # backend Jest + frontend Vitest
npm run test -w frontend
npm run test:watch -w frontend
```

## Running

| Stack | Command | URL |
|-------|---------|-----|
| New | `npm run dev` (root) | API :5000, UI :5173 |
| Legacy | `npm run dev:legacy` | :5000 |
