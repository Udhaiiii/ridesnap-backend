# How to run RideSnap (new stack)

This guide is for the **React + NestJS + PostgreSQL** app on branch **`newTechStack`**.

The legacy Express/SQLite app is under `ridesnap-backend/` and does **not** use Prisma.

---

## Where is Prisma?

Prisma is **only** in the NestJS backend — not at the repo root.

```
rideSnap/
├── backend/
│   └── prisma/
│       ├── schema.prisma          ← database models (PostgreSQL)
│       ├── seed.ts                ← default admin user, sample rides
│       └── migrations/
│           └── 20260519000000_init/
│               └── migration.sql
├── frontend/                      ← React (no Prisma here)
└── ridesnap-backend/              ← OLD stack (SQLite via database.js, no Prisma)
```

If you looked at the repo root or `ridesnap-backend/`, you will not find `schema.prisma`. Open:

**`backend/prisma/schema.prisma`**

Prisma CLI commands must be run from the **`backend/`** folder (or via `npm run … -w backend` from the root).

---

## Prerequisites

- Node.js **20+** (see `.nvmrc`)
- Docker (for local Postgres), or an existing PostgreSQL database
- Optional: AWS S3, Gmail, Fast2SMS for photos/email/SMS

---

## First-time setup

### 1. Branch and install

```bash
cd ~/Desktop/rideSnap
git checkout newTechStack
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

Default connection (matches `backend/.env.example`):

`postgresql://ridesnap:ridesnap@localhost:5432/ridesnap?schema=public`

### 3. Backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` as needed (S3, email, UPI, etc.). `DATABASE_URL` must point at your Postgres instance.

### 4. Database: generate client, migrate, seed

From **repo root**:

```bash
npm run prisma:generate -w backend
npm run db:migrate -w backend
npm run db:seed
```

Or from **`backend/`** (recommended — Prisma resolves paths relative to here):

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

### 5. Frontend environment

```bash
echo "VITE_API_URL=http://localhost:5000/api" > frontend/.env
```

---

## Run (every day)

From repo root:

```bash
docker compose up -d postgres   # skip if already running
npm run dev
```

| What | URL |
|------|-----|
| React UI | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/api/health |
| Swagger | http://localhost:5000/api/docs |

**Login:** `admin` / `admin@123`

---

## Run backend and frontend separately

**API:**

```bash
npm run dev -w backend
```

**UI:**

```bash
npm run dev -w frontend
```

---

## UI routes

| Screen | Path |
|--------|------|
| Login | `/login` |
| Dashboard | `/` |
| Photographer (QR scan) | `/photographer` |
| Photo desk | `/photo-desk` |
| Print queue | `/print` |
| Admin | `/admin` |
| Bulk QR | `/bulk-qr` |
| Financial report | `/reports` |
| Receipt | `/receipt/:orderId` |

---

## Useful commands

```bash
# Tests
npm test
npm run test -w frontend
npm run test -w backend

# Production build
npm run build

# Prisma Studio (GUI for DB) — run from backend/
cd backend && npx prisma studio

# New migration after schema change — run from backend/
cd backend && npx prisma migrate dev --name your_change_name
```

---

## Legacy stack (HTML + Express + SQLite)

No Prisma. Uses `ridesnap-backend/src/db/database.js` and `ridesnap.db`.

```bash
npm run install:legacy
npm run dev:legacy
```

Open http://localhost:5000

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Can't find `schema.prisma` | Look in **`backend/prisma/schema.prisma`**, not repo root |
| `prisma` command fails from root | `cd backend` first, or use `npm run … -w backend` |
| DB connection error | `docker compose up -d postgres`, check `DATABASE_URL` in `backend/.env` |
| Port 5000 in use | Change `PORT` in `backend/.env` and `frontend/.env` `VITE_API_URL` |
| Photo upload fails | Set `AWS_*` and `S3_*` in `backend/.env` |

---

## Repo layout (quick reference)

See [ARCHITECTURE.md](ARCHITECTURE.md) for full detail.
