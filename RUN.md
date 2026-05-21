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

### 5. Frontend environment (optional)

For local dev you usually **do not** need `frontend/.env`. Vite proxies `/api` → `http://localhost:5000` automatically.

If you created `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`, **delete that line or the whole file** — it causes CORS errors on login.

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

## UI flow (matches legacy HTML)

1. **Login** — `/login` (same as `login.html`)
2. **Staff portal** — `/` (same as `index.html`: hero, live stats, role cards)
3. **Modules** — open only when you click a card; each route is **lazy-loaded** (separate JS chunk)

| Module | Legacy file | React path |
|--------|-------------|------------|
| Photographer App | `ridesnap.html` | `/photographer` |
| Photo Desk | `photo-desk.html` | `/photo-desk` |
| Print Dashboard | `print-dashboard.html` | `/print` |
| Wristband Printer | `bulk-qr-printer.html` | `/bulk-qr` |
| Admin Dashboard | `admin-dashboard.html` | `/admin` |
| Receipt | `receipt.html` | `/receipt` |
| Financial Report | `financial-report.html` | `/reports` |

Styling uses **Tailwind CSS** with the same dark portal theme (Bebas Neue, DM Sans, amber accents) as `ridesnap-backend/public/index.html`.

Legacy Express pages remain in `ridesnap-backend/public/` for `npm run dev:legacy`.
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

### `Can't reach database server at localhost:5432` (Prisma P1001)

The Nest API needs **PostgreSQL running** before `npm run dev`. The app will crash on startup if nothing is listening on port 5432.

**Option A — Docker (recommended)**

1. Start Docker:
   - **Docker Desktop:** open the app and wait until it says “Running”
   - **Colima:** `colima start`
2. Start Postgres:

```bash
cd ~/Desktop/rideSnap
docker compose up -d postgres
docker compose ps          # should show postgres "running"
```

3. Confirm `backend/.env` has:

```env
DATABASE_URL=postgresql://ridesnap:ridesnap@localhost:5432/ridesnap?schema=public
```

4. Apply migrations (first time only):

```bash
cd backend
npx prisma migrate deploy
npm run prisma:seed
```

5. Start the app again: `npm run dev` (from repo root)

**Option B — Postgres installed locally (no Docker)**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb ridesnap
```

Then set in `backend/.env`:

```env
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/ridesnap?schema=public
```

(Create user/password in Postgres if you use auth — URL must match your local setup.)

---

| Issue | What to do |
|-------|------------|
| Can't find `schema.prisma` | Look in **`backend/prisma/schema.prisma`**, not repo root |
| `prisma` command fails from root | `cd backend` first, or use `npm run … -w backend` |
| DB connection error | Start Docker/Colima, then `docker compose up -d postgres` |
| `docker: command not found` / socket error | Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or run `colima start` |
| Port 5000 in use | Change `PORT` in `backend/.env` |
| **CORS error on login** | Remove `frontend/.env` or unset `VITE_API_URL`; use http://localhost:5173 (not only 127.0.0.1 unless backend `CORS_ORIGIN` includes it); restart `npm run dev` |
| Photo upload fails | Set `AWS_*` and `S3_*` in `backend/.env` |

---

## Repo layout (quick reference)

See [ARCHITECTURE.md](ARCHITECTURE.md) for full detail.
