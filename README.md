# Lotus Frontend (`identical-front`)

TanStack Start + Vite web app for the CSIT321 Metabolic Syndrome analytics project.

## Prerequisites

- **Node.js 20+** and npm
- **Python 3.10+** (for the API — lives in the sibling backend repo)
- Access to the **shared Supabase project** (ask a teammate for the anon + service_role keys)

## Repos (clone side by side)

```bash
mkdir lotus-dev && cd lotus-dev

git clone https://github.com/AdrianMartinovici/CSIT321_Project.git
git clone https://github.com/shauryacuriosity/identical-front.git
```

Expected layout:

```text
lotus-dev/
├── CSIT321_Project/    ← API + ML pipeline
└── identical-front/    ← this repo
```

## First-time setup (easiest)

From the **backend** repo:

```bash
cd CSIT321_Project
./scripts/first-time-setup.sh
```

This installs Python + npm deps, creates `api/.env` and `identical-front/.env`, and optionally seeds a local demo dataset.

**Then edit secrets** (never commit these):

| File | Key to fill in |
|------|----------------|
| `CSIT321_Project/api/.env` | `SUPABASE_SERVICE_ROLE_KEY` |
| `identical-front/.env` | `VITE_SUPABASE_ANON_KEY` |

Get both keys from a teammate or the team password manager.

## Run the full stack

From `CSIT321_Project`:

```bash
./scripts/dev-stack.sh
```

Opens:

- Frontend → http://localhost:8080
- API → http://localhost:8000 (health: `/health`)

Press **Ctrl+C** to stop both servers.

## Run frontend only

Useful for UI work with in-memory mocks (no backend):

```bash
cd identical-front
./scripts/setup-env.sh
# Edit .env: leave VITE_API_BASE_URL blank, VITE_USE_MOCK_API=true
npm install
npm run dev
```

## Environment variables

Copy `.env.example` → `.env` (or run `./scripts/setup-env.sh`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Lotus API base URL (`http://localhost:8000` for full stack) |
| `VITE_USE_MOCK_API` | `true` = in-memory mocks even if URL is set |
| `VITE_SUPABASE_URL` | Shared Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key (safe for browser) |

## What talks to what

| Pages | Backend |
|-------|---------|
| Projects, Datasets, Pipeline | Lotus API (`VITE_API_BASE_URL`) |
| AI Analysis, Run results | Supabase directly |

Run processing (after creating a run in the UI) is triggered manually:

```bash
curl -X POST http://localhost:8000/runs/<run-id>/process
```

See `CSIT321_Project/api/README.md` for run reset SQL and endpoint details.

## Git workflow

Each repo is independent — pull and push separately:

```bash
cd identical-front && git pull && git push
cd ../CSIT321_Project && git pull && git push
```

**Do not commit** `.env` files. Only `.env.example` is tracked.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `./scripts/setup-env.sh` | Create `.env` from example |
