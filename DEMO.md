# Lotus — 5-minute demo script

> **Audience:** teammates, judges, capstone reviewers.  
> **Goal:** walk through the golden path on production without touching broken or misleading UI.  
> **Time:** ~5 minutes (plus 2 minutes if you trigger a live ML run).

---

## Production URLs (use these exact values)

| Service | URL |
|---------|-----|
| **App (Vercel)** | https://identical-front.vercel.app |
| **API (Railway)** | https://vivacious-wisdom-production.up.railway.app |
| **API health** | https://vivacious-wisdom-production.up.railway.app/health |
| **Supabase** | https://poizespthezmvrfhcyps.supabase.co |

---

## Demo IDs (do not change)

| Entity | ID |
|--------|-----|
| **Project** (eAsia MetS Demo) | `e1111111-0000-0000-0000-000000000001` |
| **Dataset** (eAsia full cohort) | `510a6e3f-2a6f-4824-99f6-f2cf6efbabeb` |
| **Seeded run** (pre-computed results) | `bbbbbbbb-0000-0000-0000-000000000002` |

Direct link to seeded run results:

https://identical-front.vercel.app/runs/bbbbbbbb-0000-0000-0000-000000000002

---

## Prerequisites (before you present)

### 1. Environment variables (Vercel + Railway)

See [`DEPLOY.md`](./DEPLOY.md) for the full checklist. Minimum for a working demo:

| Variable | Where | Value |
|----------|-------|-------|
| `VITE_API_BASE_URL` | Vercel | `https://vivacious-wisdom-production.up.railway.app` |
| `VITE_USE_MOCK_API` | Vercel | `false` |
| `VITE_SUPABASE_URL` | Vercel | `https://poizespthezmvrfhcyps.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Vercel | anon key from Supabase dashboard (safe in browser) |
| `SUPABASE_URL` | Railway | same Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | service_role key (**never** in Vercel) |
| `ALLOWED_ORIGINS` | Railway | includes `https://identical-front.vercel.app` |
| `ALLOWED_ORIGIN_REGEX` | Railway | `^https://.*\.vercel\.app$` |

**Human-only secrets:** anon and service_role keys live in the team password manager — agents cannot paste them here.

### 2. Railway bootstrap (eAsia project on disk)

Supabase seed does **not** create the eAsia project. Projects live in the API's `STORAGE_DIR` volume.

After Railway volume is mounted at `/app/api_storage`, open a **Railway shell** on the API service:

```bash
cd /app && PYTHONPATH=/app STORAGE_DIR=/app/api_storage \
  python api/scripts/seed_local_demo.py --force
```

Verify:

```bash
curl https://vivacious-wisdom-production.up.railway.app/projects
```

You should see **eAsia MetS Demo · Full Cohort Analysis** (`e1111111-0000-0000-0000-000000000001`) plus at least one other project.

### 3. Supabase seed (dataset + run rows)

If `seed.sql` failed on `figure_paths`, apply migration `20260528000002_align_result_columns_for_seed.sql` first:

```bash
cd CSIT321_Project && supabase db push
```

Then re-run `supabase/seed.sql` in the Supabase SQL editor (or `psql … -f supabase/seed.sql`).

The seed is idempotent — safe to run against the live project.

### 4. Quick health check

```bash
curl https://vivacious-wisdom-production.up.railway.app/health
# expect: {"status":"ok","supabase_configured":true}
```

Open https://identical-front.vercel.app — no CORS errors in browser devtools when the home page loads projects.

---

## Demo login

Shared account (documented in [`CAPSTONE_DEMO_LOGIN.md`](./CAPSTONE_DEMO_LOGIN.md)):

| Field | Value |
|-------|--------|
| **URL** | https://identical-front.vercel.app/login |
| **Email** | `lotus.demo@uow.edu.au` |
| **Password** | `LotusDemo2026!` |

Judges may also sign up with their own email if preferred.

---

## 5-minute script

### Minute 0–1 — Login & home

1. Open https://identical-front.vercel.app/login
2. Sign in with the demo account above.
3. **Home** should list projects fetched from the Railway API (not an empty mock list).
4. Click **eAsia MetS Demo · Full Cohort Analysis** (project `e1111111-…`).

**Talking point:** "Lotus is a public-health analytics workbench — projects, datasets, visualisation, and ML runs in one flow."

### Minute 1–2 — Datasets & pipeline

1. From the project row, open **Datasets** (or navigate to `/datasets?projectId=e1111111-0000-0000-0000-000000000001`).
2. Show the attached datasets (3 tables in the eAsia demo).
3. Briefly show the pipeline preview / join step — enough to convey data prep, not a full walkthrough.

**Talking point:** "We ingest NHANES-style cohort CSVs, join clinical and dietary tables, and persist pipeline state per project."

### Minute 2–3 — Visualisation

1. Open **Visualisation** (`/visualisation?projectId=e1111111-0000-0000-0000-000000000001`).
2. Show one chart (bar or scatter) built from the project's pipeline output.

**Talking point:** "Exploratory charts are saved with the project — state survives page navigation."

### Minute 3–4 — AI Analysis (fast path: seeded run)

**Option A — show pre-computed results (recommended, ~30 s):**

1. Open https://identical-front.vercel.app/runs/bbbbbbbb-0000-0000-0000-000000000002
2. Walk through EDA metrics, model scores, cluster summary, and prediction table.

**Option B — trigger a new live run (~8–10 s on Railway):**

1. Open **AI Analysis** (`/ai-analysis?projectId=e1111111-0000-0000-0000-000000000001`).
2. Select dataset **eAsia MetS Demo - Full Analysis Cohort** (`510a6e3f-…`).
3. Leave **Full analysis** selected; optionally adjust the age slider (20–80).
4. Click **Run analysis** → app navigates to `/runs/<new-id>` and calls `POST /runs/<id>/process`.
5. Wait for status **complete** (~8 s).

**Talking point:** "The FastAPI worker runs EDA, XGBoost + baseline models, K-means clustering, and writes results back to Supabase."

### Minute 4–5 — Security & compliance (30 s)

Read aloud from [`COMPLIANCE.md`](./COMPLIANCE.md) (judges blurb at the top). Cross-link: backend detail in [`CSIT321_Project/SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md).

---

## What NOT to click (during the demo)

| Avoid | Why |
|-------|-----|
| **Mock API mode** (`VITE_USE_MOCK_API=true`) | UI works but no real backend — projects/runs are fake. Never demo production with mock env. |
| **"Generate labels only"** function mode | UI skips the method step, but the **server still runs the full EDA + models + clustering pipeline**. Do not claim labels-only behaviour is implemented server-side. |
| **"Prediction only" / "Subgroup discovery only"** | UI preview modes — server ignores `function_mode` today and always runs the full pipeline. |
| **Create new project** if home is empty | Usually means Railway seed was not run — fix bootstrap first instead of improvising. |
| **Upload real patient data** | Demo uses de-identified NHANES-derived cohorts. No real PHI. |
| **Delete demo project / run** | Breaks the golden path for the next presenter. |
| **Forgot-password flow** | Not part of the capstone demo unless B1 auth is fully verified. |

### Honest caveat: `function_mode`

The AI Analysis UI stores `function_mode` on each run (`full`, `prediction_only`, `subgroup_only`, `labels_only`), but **`api/jobs/processor.py` does not branch on it**. Every processed run executes EDA → models → clustering regardless of the UI selection. Mention this if a judge asks about partial pipelines — it is on the roadmap, not shipped.

---

## Fallback if a run fails

### Symptom: run stuck in `pending` / `error`, or `/runs/bbbbbbbb-…` is empty

1. Check API health and Supabase config:

   ```bash
   curl https://vivacious-wisdom-production.up.railway.app/health
   ```

2. Re-process the seeded run from your laptop (requires `SUPABASE_SERVICE_ROLE_KEY` in env):

   ```bash
   cd CSIT321_Project
   export SUPABASE_URL=https://poizespthezmvrfhcyps.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=<from password manager>
   export RUN_ID=bbbbbbbb-0000-0000-0000-000000000002
   export DATASET_ID=510a6e3f-2a6f-4824-99f6-f2cf6efbabeb
   PYTHONPATH=. python api/scripts/smoke_process_run.py
   ```

   Or trigger via curl (Railway must have service role configured):

   ```bash
   curl -X POST https://vivacious-wisdom-production.up.railway.app/runs/bbbbbbbb-0000-0000-0000-000000000002/process
   ```

3. If home has no projects, re-run Railway bootstrap (see Prerequisites §2).

4. If dataset/run rows are missing, re-apply Supabase seed (see Prerequisites §3).

5. **Last resort for UI-only demo:** open the direct seeded run URL above — seed includes static EDA/model/cluster rows even if live processing fails.

---

## Troubleshooting cheat sheet

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Empty home / no projects | Railway `api_storage` not seeded | `seed_local_demo.py --force` in Railway shell |
| CORS error in console | `ALLOWED_ORIGINS` missing Vercel URL | Update Railway env, redeploy — see [`DEPLOY.md`](./DEPLOY.md) |
| Login redirect loop | Supabase redirect URLs | Add `https://identical-front.vercel.app/**` in Supabase Auth settings |
| Run 404 | Supabase seed not applied | Run `supabase/seed.sql` |
| `supabase_configured: false` | Missing service role on Railway | Set `SUPABASE_SERVICE_ROLE_KEY` |

---

## Related docs

- [`DEPLOY.md`](./DEPLOY.md) — Vercel + Railway deploy, env vars, CORS, rollback
- [`COMPLIANCE.md`](./COMPLIANCE.md) — HIPAA talking points for judges
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system diagram
- [`CAPSTONE_DEMO_LOGIN.md`](./CAPSTONE_DEMO_LOGIN.md) — shared login credentials
- [`../UniProjects/CSIT321_Project/SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md) — RLS, auth, service role (canonical)
