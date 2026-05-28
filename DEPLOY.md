# Lotus deploy — Vercel (frontend) + Railway (API)

> **Authoritative doc for A1 (Vercel + hosted API).** Anything in here overrides
> ad-hoc Slack instructions. Keep it accurate as URLs land.

The Lotus capstone runs as two independently-deployable services:

| Layer | Repo | Host | Why |
|-------|------|------|-----|
| Frontend (TanStack Start + Vite, TS) | `identical-front` | **Vercel** | Native TanStack Start support (Vercel changelog Nov 2025) + previews per PR. |
| FastAPI + ML worker (`uvicorn api.main:app`) | `CSIT321_Project` | **Railway** (Docker) | Python 3.11 + sklearn/xgboost/shap + `POST /runs/{id}/process` (~8 s). Vercel Functions can't run the ML pipeline reliably. |
| Auth + Postgres | n/a | Supabase (`poizespthezmvrfhcyps`) | Single project shared by every environment until we add staging. |

Picked Railway over Render/Fly because:

- Docker first-class, zero-config for `api/Dockerfile`.
- Persistent volumes (we need `/app/api_storage`).
- Healthcheck + auto-redeploy on git push.

The `wrangler.jsonc` Cloudflare config is **kept intentionally** — historical artefact for the team. We do **not** deploy to Cloudflare. Vercel is the canonical production host.

---

## TL;DR public URLs

| Env | URL | Status |
|-----|-----|--------|
| Frontend — Vercel **production** | `https://identical-front.vercel.app` | live |
| Frontend — Vercel **preview** (per PR) | `https://<branch>-identical-front.vercel.app` | auto on push |
| API — Railway **production** | `https://vivacious-wisdom-production.up.railway.app` | live |
| Supabase | `https://poizespthezmvrfhcyps.supabase.co` | live |

---

## Architecture choice — TanStack Start on Vercel

TanStack Start can ship to Vercel in two shapes. We picked **Option A** (SSR via Nitro) and documented the static-fallback as an emergency exit.

### Option A — Nitro + Vercel preset (recommended, official)

Per [Vercel's Nov 2025 TanStack Start announcement](https://vercel.com/changelog/support-for-tanstack-start) and the [TanStack Start hosting docs](https://tanstack.com/start/latest/docs/framework/react/hosting), the supported path is:

1. Install `nitro` as a dev dep.
2. In `vite.config.ts`, disable the Cloudflare plugin and add `nitro()` to the plugin list.
3. Vercel auto-detects TanStack Start, builds with Fluid Compute, gives free preview URLs.

### Option B — Static SPA fallback (emergency)

If Option A misbehaves close to the demo, we can build the client bundle and ship `dist/client/` to Vercel as a pure SPA: TanStack Router still does its job client-side, server functions and SSR are sacrificed. To do this:

1. Build locally (`npm run build`).
2. Push `dist/client/` to a sibling repo or run `vercel --prebuilt` from CI.
3. Add a SPA fallback rewrite in `vercel.json` (`"rewrites": [{ "source": "/(.*)", "destination": "/" }]`).

Document trade-offs in the demo PR before flipping to Option B.

### Trade-offs

| | Option A (Nitro+Vercel) | Option B (static SPA) |
|---|---|---|
| SSR / streaming | ✅ | ❌ |
| Server functions | ✅ | ❌ |
| Preview URLs | ✅ auto | ✅ auto |
| Bundle size hit | normal | smaller (no server bundle) |
| Time to first deploy | ~5 min after `vite.config.ts` swap | ~5 min, no code change |
| Demo risk | low | low |

---

## ⚠️ HUMAN ACTIONS REQUIRED before this works in prod

The agent cannot perform any of the following (UI / SSO / billing-gated). Knock these out in order:

1. **Vercel** — log in at <https://vercel.com>, create the `identical-front` project, connect the GitHub repo `shauryacuriosity/identical-front`. Branch: `main` → Production. Preview: every other branch.
2. **Vercel env vars** — paste the table below into Project → Settings → Environment Variables (mark each for **Production** + **Preview** + **Development**).
3. **Railway** — log in at <https://railway.app>, create a new project, "Deploy from GitHub" → pick `AdrianMartinovici/CSIT321_Project`. Railway will detect `railway.toml` and `api/Dockerfile`.
4. **Railway volume** — Service → Volumes → new volume, mount at `/app/api_storage`, ≥1 GiB. Needed so run artefacts survive redeploys.
5. **Railway env vars** — paste the API column from the env table into Service → Variables.
6. **Railway custom domain (optional)** — note the `*.up.railway.app` URL the service gets.
7. **Apply the Vite/Nitro swap** (Option A above). The exact diff to apply to `vite.config.ts` once a teammate is ready:

   ```ts
   // 1. npm i -D nitro
   // 2. Replace vite.config.ts body with:
   import { defineConfig } from "@lovable.dev/vite-tanstack-config";
   import { nitro } from "nitro/vite";

   export default defineConfig({
     cloudflare: false,
     plugins: [nitro({ preset: "vercel" })],
     tanstackStart: { server: { entry: "server" } },
   });
   ```

   Local `npm run dev` is unaffected (Nitro only kicks in at build). Don't delete `wrangler.jsonc` — keep it for historical reference.

8. **Vercel ← API URL** — after Railway gives you the API hostname, set `VITE_API_BASE_URL` in Vercel to that exact URL, redeploy.
9. **Railway ← Vercel URL** — after Vercel gives you the production hostname, set `ALLOWED_ORIGINS` and `ALLOWED_ORIGIN_REGEX` in Railway (see CORS section), redeploy.
10. **Supabase Auth redirect URLs** — Dashboard → Authentication → URL Configuration → add `https://<vercel-project>.vercel.app/**` and `https://*-<vercel-project>.vercel.app/**` to the allowlist. (Coordinate with A2 / B1 — they own auth.)

---

## Env var checklist

| Variable | Vercel **Preview** | Vercel **Production** | Railway (API) | Source |
|----------|-------------------|----------------------|---------------|--------|
| `VITE_API_BASE_URL` | `https://<railway-service>.up.railway.app` | same | n/a | Railway URL after step 3. |
| `VITE_USE_MOCK_API` | `false` | `false` | n/a | Hardcoded. Toggle to `true` only to run the UI with no backend. |
| `VITE_SUPABASE_URL` | `https://poizespthezmvrfhcyps.supabase.co` | same | n/a | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | `<anon key>` | same | n/a | Supabase → Settings → API → "anon public" key. **Safe in browser.** |
| `SUPABASE_URL` | n/a | n/a | `https://poizespthezmvrfhcyps.supabase.co` | same project. |
| `SUPABASE_SERVICE_ROLE_KEY` | n/a | n/a | `<service_role key>` | Supabase → Settings → API → "service_role" key. **Never put in any VITE_* var.** |
| `SUPABASE_STORAGE_BUCKET` | n/a | n/a | `run-artifacts` | Existing bucket. |
| `ALLOWED_ORIGINS` | n/a | n/a | `http://localhost:8080,https://<vercel-prod>.vercel.app` | Exact origins the API trusts. |
| `ALLOWED_ORIGIN_REGEX` | n/a | n/a | `^https://.*\.vercel\.app$` | One regex covering every preview URL. |
| `STORAGE_DIR` | n/a | n/a | `/app/api_storage` | Mount path of the Railway volume. |
| `PORT` | n/a | n/a | **leave unset** — Railway injects it | `api/Dockerfile` falls back to 8000 locally. |

Service role key has full DB access — keep it in Railway only, never in Vercel.

### Local Docker API (`docker-up.sh`)

From `CSIT321_Project`:

```bash
./scripts/docker-up.sh   # builds api container, seeds api_storage if empty
```

Then run the frontend on the host: `cd identical-front && npm run dev` → http://localhost:8080

### Railway demo seed (`api_storage`)

The API stores **projects** on disk under `STORAGE_DIR` (volume at `/app/api_storage`). Supabase seed does not create the eAsia project (`e1111111-…`).

After the volume is mounted, open a **Railway shell** on the API service and run:

```bash
cd /app && PYTHONPATH=/app STORAGE_DIR=/app/api_storage \
  python api/scripts/seed_local_demo.py --force
```

Then verify: `GET https://vivacious-wisdom-production.up.railway.app/projects` should list the eAsia demo project.

### Supabase demo seed (`seed.sql`)

If `seed.sql` failed on `figure_paths`, apply migration `20260528000002_align_result_columns_for_seed.sql` first:

```bash
cd CSIT321_Project && supabase db push
```

Then re-run `supabase/seed.sql` in the SQL editor (or `psql … -f supabase/seed.sql`).

---

## CORS update step (after both URLs land)

1. Copy your Vercel production URL (e.g. `https://lotus.vercel.app`).
2. Railway → Service → Variables → set:
   - `ALLOWED_ORIGINS=http://localhost:8080,https://lotus.vercel.app`
   - `ALLOWED_ORIGIN_REGEX=^https://.*\.vercel\.app$`
3. Railway redeploys automatically on save.
4. Verify with browser devtools — load the Vercel URL, open any page that calls the API, check no CORS error in console.

`api/main.py` reads both `ALLOWED_ORIGINS` (comma-separated exact list) and `ALLOWED_ORIGIN_REGEX` (single regex for preview URLs). Localhost:8080 is always allowed for dev parity.

---

## Redeploy

### Frontend (Vercel)

- Push to `main` → Vercel triggers production deploy automatically.
- Force a redeploy with the same commit: Vercel dashboard → Deployments → ⋯ → "Redeploy".
- CLI alternative: `vercel deploy --prod` (requires `vercel login` first). Don't run this from CI without scoped tokens.

### Backend (Railway)

- Push to `main` in `CSIT321_Project` → Railway triggers a rebuild.
- Manual: Railway dashboard → Service → Deployments → "Redeploy".
- CLI alternative: `railway up` (requires `railway login`).

---

## Rollback

### Frontend (Vercel)

Vercel keeps every deployment immutable.

1. Dashboard → Deployments → pick the last known-good deployment → ⋯ → **"Promote to Production"**.
2. DNS / `*.vercel.app` flips instantly. No rebuild required.

### Backend (Railway)

1. Dashboard → Service → Deployments → pick prior deployment → ⋯ → **"Redeploy"**.
2. If a bad migration shipped, also roll the Supabase schema (A2 owns).

---

## Local dev unchanged

`npm run dev` still uses the existing Lovable/Cloudflare vite config — none of the changes in this folder affect local dev.

- Frontend: `npm run dev` → http://localhost:8080
- API: `uvicorn api.main:app --reload --port 8000` → http://localhost:8000
- One command: `./scripts/dev-stack.sh` (frontend repo).

If `vite.config.ts` is swapped to Nitro+Vercel preset (Option A), `npm run dev` still works — Nitro replaces only the build adapter.

---

## Verification checklist (after both URLs are live)

- [ ] `curl https://<railway-service>.up.railway.app/health` → `{"status":"ok","supabase_configured":true}`
- [ ] Open `https://<vercel-prod>.vercel.app` → app loads, no console CORS errors
- [ ] Login (after B1 + A2 ship) → home shows projects from API
- [ ] Hit `POST /runs/bbbbbbbb-0000-0000-0000-000000000002/process` from the deployed UI or `curl` → 200 within ~10 s
- [ ] Vercel preview URL for a feature branch is allowed by API CORS

---

## Files this agent touched

Frontend repo (`identical-front`):
- `vercel.json` *(new — minimal build hints)*
- `DEPLOY.md` *(this file)*
- `.env.example` *(additive comments about Vercel preview env)*

Backend repo (`CSIT321_Project`):
- `api/main.py` *(CORS: added `ALLOWED_ORIGIN_REGEX` env support)*
- `api/Dockerfile` *(honour `$PORT` for Railway / Render / Fly)*
- `api/.env.example` *(additive — Railway/CORS hints, no secrets)*
- `railway.toml` *(new — build + healthcheck + start)*
- `README.md` *(small "hosted deploy" cross-link section)*

No secrets committed. `.env` files remain untracked. No other code refactors.
