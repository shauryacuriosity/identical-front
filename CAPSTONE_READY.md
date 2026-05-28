# Lotus — Demo quick reference

## Live URLs

| | URL |
|---|-----|
| **App** | https://lotusapp.org (also https://identical-front.vercel.app) |
| **API** | https://vivacious-wisdom-production.up.railway.app |
| **API health** | https://vivacious-wisdom-production.up.railway.app/health |

## Demo login (shared — everyone uses the same account)

| | |
|---|---|
| **Email** | `lotus.demo@uow.edu.au` |
| **Password** | `LotusDemo2026!` |

Also documented in [`CAPSTONE_DEMO_LOGIN.md`](./CAPSTONE_DEMO_LOGIN.md).

1. Open https://lotusapp.org/login
2. Sign in → **Home** with projects

You can still **Sign up** with your own email if you prefer a personal account.

## 5-minute demo script

1. **Login** → home
2. Open **eAsia MetS Demo · Full Cohort Analysis** (3 datasets)
3. **Datasets** → show pipeline / preview
4. **Visualisation** → one chart
5. **AI Analysis** → dataset `510a6e3f-…` (eAsia full cohort) → run or open seeded results:
   - https://lotusapp.org/runs/bbbbbbbb-0000-0000-0000-000000000002

## What's included

- Hosted app (Vercel) + API (Railway) + Supabase auth/RLS
- Login-first flow, shared demo account, seeded eAsia project and run
- Mobile-friendly layout ([`MOBILE.md`](./MOBILE.md))
- Docs: [`DEMO.md`](./DEMO.md), [`COMPLIANCE.md`](./COMPLIANCE.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- CI: `npm run test`, `pytest tests/test_smoke.py` in backend repo

## Local dev

```bash
# Terminal 1 — backend
cd CSIT321_Project && ./scripts/dev-stack.sh   # from identical-front:
# or CSIT321_Project only: source .venv && uvicorn api.main:app --reload --port 8000

# Terminal 2 — frontend only
cd identical-front && npm run dev
```

## If home is empty on Vercel

Railway may still be redeploying. Check:

```bash
curl https://vivacious-wisdom-production.up.railway.app/projects
```

You want **2+ projects** including "eAsia MetS Demo · Full Cohort Analysis". If empty, redeploy Railway once more from `CSIT321_Project`:

```bash
npx @railway/cli up -s vivacious-wisdom
```

## HIPAA one-liner (30 sec)

"Lotus is a public-health analytics workbench using de-identified demo cohorts. Auth and RLS are via Supabase; we are not claiming HIPAA certification. Do not upload real patient identifiers in production."
