# Lotus — Capstone demo (you're ready)

## Live URLs

| | URL |
|---|-----|
| **App** | https://identical-front.vercel.app |
| **API** | https://vivacious-wisdom-production.up.railway.app |
| **API health** | https://vivacious-wisdom-production.up.railway.app/health |

## Demo login (ready to use)

**Pre-created account:**

| | |
|---|---|
| **Email** | `lotus.demo@uow.edu.au` |
| **Password** | See local `CAPSTONE_DEMO_LOGIN.md` (gitignored; created on your machine) |

1. Open https://identical-front.vercel.app/login
2. Sign in → **Home** with projects

You can still **Sign up** with your own email. Share the demo password only in private channels (Slack, not public repos).

## 5-minute demo script

1. **Login** → home
2. Open **eAsia MetS Demo · Full Cohort Analysis** (3 datasets)
3. **Datasets** → show pipeline / preview
4. **Visualisation** → one chart
5. **AI Analysis** → dataset `510a6e3f-…` (eAsia full cohort) → run or open seeded results:
   - https://identical-front.vercel.app/runs/bbbbbbbb-0000-0000-0000-000000000002

## What we fixed (Waves 1–2)

- Vercel + Railway deploy
- Supabase auth (login first)
- Dataset page state persistence
- AI Analysis age slider, labels-only, honest model copy
- Supabase migrations + demo run seed
- Railway auto-seeds demo on container start

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
