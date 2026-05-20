# RideSnap — React + NestJS Monorepo

Production-oriented migration of the legacy Express/SQLite `new-update` stack to:

- **`/frontend`** — React 19 + TypeScript + Vite + Zustand + React Router
- **`/backend`** — NestJS 11 + Prisma + PostgreSQL

Branch: **`newTechStack`**

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for monorepo layout and data flow.

**Step-by-step run guide:** **[RUN.md](RUN.md)** (includes where Prisma lives: `backend/prisma/schema.prisma`).

Legacy code is preserved under `ridesnap-backend/` for reference.

---

## Feature parity (from `new-update`)

| Area | Capabilities |
|------|----------------|
| **Wristbands** | Daily batch generation, validation, listing, batch stats, Zebra ZPL printing |
| **Visits** | Check-in, lookup by wristband, guest details, today’s visit list |
| **Photos** | Multipart upload, S3 presign, metadata via Sharp |
| **Orders** | Single + bulk orders, pricing, payment modes/splits, email receipts |
| **Print queue** | Today’s queue, status workflow (queued → printing → done → collected) |
| **Rides** | CRUD + photo ride_name sync |
| **Auth** | Role-based login (admin, photographer, counter, print), 12h sessions |
| **Users** | Admin-only user management |
| **Delivery** | Email, SMS (Fast2SMS), WhatsApp deep links |
| **Short links** | `/p/:code` public download page (7-day expiry) |
| **Reports** | Daily financial breakdown |
| **Receipts** | GST reference receipt data |
| **Config** | Park name, live prices, UPI settings |

---

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) or a managed Postgres instance
- AWS S3 credentials (photo storage)
- Optional: Gmail, Fast2SMS, Zebra printer on Windows

---

## Quick start (local)

### 1. Database

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and AWS/email keys

npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

npm run dev
```

API: `http://localhost:5000`  
Health: `GET /api/health`  
OpenAPI UI: `http://localhost:5000/api/docs` (dev, or set `ENABLE_SWAGGER=true`)

Default admin: **`admin` / `admin@123`** (change after first login)

### 3. Frontend

```bash
cd frontend
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm install
npm run dev
```

UI: `http://localhost:5173`

### Monorepo (NestJS + React)

From repo root:

```bash
npm install
npm run dev
```

React UI routes: `/photo-desk` (full payment flow), `/bulk-qr`, `/admin`, `/reports`, `/photographer`, `/print`, `/receipt/:orderId`.

### Legacy Express + SQLite (HTML UI)

```bash
npm run install:legacy
npm run dev:legacy
```

Serves `ridesnap-backend/public/*.html` at `http://localhost:5000`.

---

## Environment variables

See [`backend/.env.example`](backend/.env.example). Critical values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Frontend origin(s), comma-separated |
| `BASE_URL` | Public URL for short links (`/p/:code`) |
| `AWS_*` / `S3_*` | Photo storage |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail receipt emails |
| `FAST2SMS_KEY` | SMS delivery |
| `PRICE_*` | Order pricing (INR) |
| `PRINTER_NAME` | Windows Zebra printer name |

---

## API overview

All JSON routes are prefixed with `/api` unless noted.

- `POST /api/auth/login` · `GET /api/auth/verify` · `POST /api/auth/logout`
- `GET|POST /api/wristbands/*` — generation, validation, batches
- `GET|POST|PATCH /api/visits/*`
- `POST /api/photos/upload` · `POST /api/photos/presign`
- `POST /api/orders` · `POST /api/orders/bulk`
- `GET|PATCH /api/print-queue/*`
- `GET|POST|PATCH|DELETE /api/rides`
- `GET /api/stats` · `GET /api/reports/daily`
- `GET /api/receipt/:order_id`
- `POST /api/send/email|sms|whatsapp-link`
- `GET /api/config`
- `POST /api/print/wristbands`
- `GET /p/:code` — **public** photo download page (no `/api` prefix)
- `GET|POST|PATCH|DELETE /api/users` — **admin + `x-auth-token` header**

Standard response shape: `{ success: boolean, ... }` with `{ success: false, error: string }` on failure.

---

## Architecture

```
backend/src/
  modules/          # Feature modules (controller → service → Prisma)
  infrastructure/   # S3, email, printer adapters
  prisma/           # Schema + migrations
  common/           # Filters, date/id utilities

frontend/src/
  pages/            # One page per legacy HTML screen
  store/            # Zustand auth state
  lib/api.ts        # Typed fetch client
```

- **PostgreSQL + Prisma** replaces SQLite with typed migrations and connection pooling readiness.
- **bcrypt** hashes passwords (seed admin uses `admin@123`; legacy plaintext still accepted once via login fallback for migrated DBs).
- **nestjs-pino** structured logging; **@nestjs/throttler** rate limiting.
- **class-validator** on all write DTOs.

---

## Tests

```bash
cd backend
npm test              # unit tests (pricing, date utils)
npm run test:cov

# e2e (requires DATABASE_URL pointing to a test DB)
npm test -- health.e2e-spec.ts
```

---

## Production deployment

1. Run `prisma migrate deploy` on release.
2. Set `NODE_ENV=production`, restrict `CORS_ORIGIN`.
3. Serve frontend static build (`frontend/dist`) behind CDN or reverse proxy.
4. Run backend with process manager (PM2, systemd, Kubernetes).
5. Configure S3 bucket CORS if uploading from browser via presign.

---

## Critical frontend ↔ backend interactions

1. **Photographer flow**: `GET /wristbands/validate/:id` → `POST /photos/upload` (multipart `photo`, `visit_id`, `ride_id`).
2. **Counter flow**: `GET /visits/:wbId` → select photos → `POST /orders` or `/orders/bulk` → receipt at `/receipt/:orderId`.
3. **Print staff**: poll `GET /print-queue` → `PATCH /print-queue/:id/status`.
4. **SMS/WhatsApp**: `POST /send/*` creates short link → guest opens `BASE_URL/p/:code`.
5. **Admin**: all routes plus `x-auth-token` on `/api/users`.

---

## Branch

```bash
git checkout newTechStack
```

Legacy stack remains on `new-update` in `ridesnap-backend/`.
