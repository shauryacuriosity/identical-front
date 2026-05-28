# Lotus — Implementation prompt playbook (internal)

> **Copy-paste ready:** use [`AGENT_COPY_PASTE.md`](./AGENT_COPY_PASTE.md).

Historical task breakdown for parallel Cursor chats. The app is already deployed; use this only if you are extending the codebase.

**Repos**
- Frontend: `~/Documents/identical-front` (Vite/TanStack Start, :8080)
- Backend: `~/Documents/UniProjects/CSIT321_Project` (FastAPI `api/`, :8000)
- Supabase project: `poizespthezmvrfhcyps`

**Demo IDs (do not change without updating DEMO.md)**
- Dataset (eAsia Full Cohort): `510a6e3f-2a6f-4824-99f6-f2cf6efbabeb`
- Seeded run (good metrics): `bbbbbbbb-0000-0000-0000-000000000002`
- Seeded project: `e1111111-0000-0000-0000-000000000001`

**Non-negotiable outcome:** Public Vercel URL + working login + full demo path (Datasets → Viz → AI Analysis → `/runs/:id`).

---

## Execution order

| Order | ID | Agent task | Blocks |
|------:|----|------------|--------|
| 1 | A1 | Vercel + API hosting architecture | Everything public |
| 1 | A2 | Supabase Auth + RLS + MFA setup | Login (B1) |
| 2 | B1 | Login screens + route guards | Most UX |
| 2 | B2 | Docker full stack | Local parity |
| 3 | C1 | Dataset page state / cache bugs | Zhuojin #1 |
| 3 | C2 | AI Analysis bugs (age slider, labels-only, descriptions) | Zhuojin #2–3 |
| 3 | C3 | P0 logic fixes (createProject, home errors, wizard honesty) | Demo integrity |
| 4 | D1 | Mobile responsive pass | Polish |
| 4 | D2 | UI contrast / depth design pass | Polish |
| 5 | E1 | DEMO.md + HIPAA talking points doc | Presentation |
| 5 | E2 | Smoke test / CI gate | Regression |

---

## A1 — Vercel deployment + hosted API (CRITICAL)

```
You are deploying the Lotus capstone app for a public company demo. Read both repos:
- Frontend: /Users/shauryakansal/Documents/identical-front
- Backend: /Users/shauryakansal/Documents/UniProjects/CSIT321_Project

GOAL: A stable public URL on Vercel for the frontend, with the FastAPI backend hosted separately (Vercel cannot run the Python ML worker reliably).

CONTEXT:
- Frontend is TanStack Start + Vite; wrangler.jsonc exists (Cloudflare) but the team wants VERCEL.
- Backend: uvicorn api.main:app, ML via POST /runs/{id}/process (~8s), needs SUPABASE_SERVICE_ROLE_KEY, STORAGE_DIR or api_storage volume.
- Frontend env (build-time): VITE_API_BASE_URL, VITE_USE_MOCK_API=false, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Backend CORS must include the Vercel preview + production origins.

TASKS:
1. Research TanStack Start on Vercel (or Vite SPA fallback if SSR blocks deploy). Prefer official TanStack/Vercel guidance. Document tradeoffs in DEPLOY.md.
2. Deploy frontend to Vercel; document every env var in Vercel dashboard.
3. Deploy API to Railway, Render, or Fly.io (pick one, simplest wins). Docker image: api/Dockerfile. Persist api_storage or document that demo seed runs on deploy.
4. Update api ALLOWED_ORIGINS / CORS for Vercel URLs.
5. Add vercel.json (or equivalent) only if needed; do not break local `npm run dev`.
6. Create DEPLOY.md with: one-time setup, env var table, how to redeploy, rollback, and the exact public URLs.
7. Verify from browser: /health on API, home loads on Vercel, projects hydrate, AI run can be triggered (or link to seeded run bbbbbbbb-0000-0000-0000-000000000002).

DO NOT: Commit secrets. Do not force-push main. Do not remove Cloudflare config without team note in DEPLOY.md.

SUCCESS CRITERIA:
- [ ] Public Vercel URL loads Lotus UI
- [ ] VITE_API_BASE_URL points to hosted API, not localhost
- [ ] CORS works (no browser blocked fetch)
- [ ] DEPLOY.md exists and is accurate
```

---

## A2 — Supabase Auth, security, RLS

```
You own Supabase security for Lotus (project poizespthezmvrfhcyps). Repos:
- Frontend: /Users/shauryakansal/Documents/identical-front
- Backend: /Users/shauryakansal/Documents/UniProjects/CSIT321_Project

Read the Supabase skill before starting. Use Supabase MCP if available.

GOAL: Production-ready auth foundation — login tables, RLS, MFA-ready, no PHI in logs. Password hashing is handled by Supabase Auth (bcrypt); do NOT roll custom password storage.

TASKS:
1. Audit tables: analysis_runs, eda_results, model_results, cluster_results, analysis_predictions, datasets (if any). Export/fix empty migration at CSIT321_Project/supabase/migrations/20260521060032_remote_schema.sql.
2. Enable Supabase Auth email/password (and optional magic link). Document redirect URLs for localhost:8080 and Vercel production URL (placeholder ok).
3. RLS policies:
   - Authenticated users can read/write their org's runs OR (for capstone) authenticated users can read demo runs — pick one model and document it.
   - Service role stays backend-only; never expose in frontend env.
   - Anon key: restrict to insert analysis_runs + read results only if required for current architecture; tighten if possible.
4. MFA: Enable TOTP in Supabase dashboard; add frontend hook points (enroll + challenge) even if minimal UI.
5. Add supabase/seed.sql or a script to ensure demo run bbbbbbbb-0000-0000-0000-000000000002 exists after fresh setup.
6. Write SECURITY.md: what is encrypted, what is not HIPAA-compliant yet, session handling, RLS summary, MFA status.

DO NOT: Put service_role in Vercel env. Do not store raw health data in auth.users metadata.

SUCCESS CRITERIA:
- [ ] Migration file in git is non-empty and applies cleanly
- [ ] RLS documented and tested with anon + authenticated JWT
- [ ] SECURITY.md written for capstone judges
```

---

## B1 — Login screens + auth-gated routing (#1 priority UX)

```
Implement real login-first UX for Lotus frontend: /Users/shauryakansal/Documents/identical-front
Coordinate with A2 (Supabase Auth) — if auth not ready, use feature flag but structure must be final.

GOAL: App opens on LOGIN when signed out; Home only when signed in. Remove fake localStorage-only "signed in" state.

CURRENT STATE:
- Profile in localStorage key `lotus-profile` in src/routes/__root.tsx
- src/integrations/supabase/client.ts has persistSession: false — FIX THIS for auth
- src/lib/api/client.ts has setAuthTokenGetter() never wired

TASKS:
1. Create routes: /login, /signup (or combined), /forgot-password. Match Lotus visual design (pink/cream, Montserrat, lotus mark from existing assets).
2. Use @supabase/supabase-js auth: signInWithPassword, signUp, signOut, getSession, onAuthStateChange. Enable persistSession + autoRefreshToken.
3. Root route guard: beforeLoad or layout — if no session, redirect to /login (except /login, /signup, /forgot-password).
4. Wire setAuthTokenGetter in __root.tsx to pass session.access_token to apiFetch.
5. Replace localStorage profile with supabase user metadata where possible; keep institution display in header.
6. Settings → Security: connect MFA enrollment UI if A2 enabled TOTP.
7. Account menu: real Sign out via supabase.auth.signOut().

DO NOT: Store passwords in localStorage. Do not skip loading state during session check.

SUCCESS CRITERIA:
- [ ] Cold visit to / redirects to /login
- [ ] After login, lands on / (home) with projects
- [ ] API requests include Authorization when logged in
- [ ] Refresh keeps session
```

---

## B2 — Docker: all services one command

```
Fix and document full Docker dev stack for Lotus.

Repos:
- Backend: /Users/shauryakansal/Documents/UniProjects/CSIT321_Project
- Frontend: /Users/shauryakansal/Documents/identical-front

CURRENT: docker-compose.yml only has `api` (+ optional jupyter). No frontend container.

GOAL: `docker compose up` starts API :8000 + frontend :8080 (or documented alternative). Works with api/.env and volume for api_storage.

TASKS:
1. Add frontend service (Node 20, npm run dev or production preview) OR document why frontend stays host-native and add `docker-compose.override` for API-only.
2. Ensure api Dockerfile installs ML deps and PYTHONPATH=/app.
3. Script `scripts/docker-up.sh` that: checks .env, runs bootstrap-local-demo if storage empty, prints URLs.
4. Set ALLOWED_ORIGINS=http://localhost:8080,http://frontend:8080
5. Update README + DEPLOY.md cross-link.

SUCCESS CRITERIA:
- [ ] New teammate can run one documented command and hit :8080 + :8000/health
- [ ] Demo seed data present after bootstrap
```

---

## C1 — Dataset page: state loss when switching pages (Zhuojin)

```
Fix workflow/cache bugs on the Datasets page so work does not disappear when navigating away and back.

Repo: /Users/shauryakansal/Documents/identical-front
Key files: src/routes/datasets.tsx, src/lib/project-work.ts, src/lib/projects-store.ts, src/lib/api/projects.ts

REPORTED BUG: "while switching on pages something will lost on dataset page"

INVESTIGATE:
1. Unsaved pipeline steps / selected datasets / preview state when navigating Home → Datasets → Visualisation → back.
2. projectId in URL search params vs in-memory state desync.
3. saveProjectWork — is Save disabled or failing silently? Does PATCH persist pipelineSteps, selectedAttrs, datasets?
4. React Query invalidation vs projects-store cache race.

TASKS:
1. Reproduce each navigation path; document exact steps in PR description.
2. Persist draft state to project via saveProjectWork on meaningful changes (debounced) OR warn "Unsaved changes" on route leave.
3. On mount, hydrate from project record (API) not stale local state.
4. Add toast on failed save.

DO NOT: Break mock mode.

SUCCESS CRITERIA:
- [ ] Associate project → add dataset → configure FROM → navigate away → return: state restored
- [ ] Manual Save still works; auto-save or leave-warning documented
```

---

## C2 — AI Analysis bugs: age slider, labels-only, model descriptions (Zhuojin)

```
Fix AI Analysis UX bugs in identical-front.

File: src/routes/ai-analysis.tsx (and related components)

BUGS:
1. Age range drag/buttons not working (custom range inputs ~lines 894–928 — likely overlapping inputs or wrong min/max binding)
2. "Generate labels only" path: continueFromCohort skips Method but runMutation.mutate() only on Method step — run never starts
3. Missing descriptions on some models/method cards (team feedback)

TASKS:
1. Fix dual-thumb age range (use Radix Slider in src/components/ui/slider.tsx OR fix native range overlap). Test drag + number inputs.
2. When methodSkipped/labels mode lands on Run step, auto-call runMutation.mutate() OR show explicit "Run Analysis" button on Run panel.
3. Add short helper text under each model option (XGBoost, Logistic, clustering) — accurate to what backend actually runs (read CSIT321_Project/api/jobs/processor.py; note processor currently runs full pipeline unless backend updated).
4. If UI options are not implemented server-side, disable them with tooltip "Coming soon" — do not lie in descriptions.

SUCCESS CRITERIA:
- [ ] Age min/max draggable and consistent
- [ ] Labels-only flow completes and navigates to /runs/:id
- [ ] Every visible model/method option has a description
```

---

## C3 — P0 demo integrity (logic fixes)

```
Fix capstone demo-breaking logic issues. Frontend repo: /Users/shauryakansal/Documents/identical-front

FIX LIST:
1. createProject() in src/lib/projects-store.ts always calls __mockCreateProject — wire to api.projects.create() in real API mode; return Promise or update callers for async ID.
2. src/routes/index.tsx: isLoading=false and error=null hardcoded — show skeleton + error when hydrateProjectsFromApi fails.
3. Column mapping step in ai-analysis.tsx: either add mappings to Supabase insert payload + backend processor, OR banner "Preview only — not applied to ML run".
4. Mock mode guard: if VITE_USE_MOCK_API=true, block Run button with clear message.
5. Redirect /ai-analysis/results — ensure no stale static page; confirm redirect to wizard or /runs/:id.

Backend optional (same PR if needed): CSIT321_Project/api/jobs/processor.py — read function_mode and skip EDA/models/clustering accordingly, or document limitation.

SUCCESS CRITERIA:
- [ ] New project in real mode persists to API
- [ ] API down shows error on home, not empty lie
- [ ] Demo script paths documented in DEMO.md (create if missing)
```

---

## D1 — Mobile responsive pass

```
Make Lotus usable on mobile for capstone demos (phones/tablets). Repo: /Users/shauryakansal/Documents/identical-front

PRIORITY PAGES: __root.tsx nav, index.tsx (project table), datasets.tsx, visualisation.tsx, ai-analysis.tsx, runs.$runId.tsx

KNOWN ISSUES: Fixed 280px sidebars, 5-column project grid, nav pill overflow.

TASKS:
1. Add responsive breakpoints: stack sidebars below content on md/sm; horizontal scroll only as last resort for tables.
2. Nav: collapse to icon-only or bottom tab bar on small screens.
3. Touch targets ≥44px for buttons/sliders.
4. Test viewports: 390px, 768px, 1280px. Screenshot notes in MOBILE.md.

DO NOT: Redesign brand colors — layout only.

SUCCESS CRITERIA:
- [ ] No horizontal overflow on iPhone-width viewport on Home, Datasets, AI Analysis
- [ ] Primary CTAs visible without zoom
```

---

## D2 — UI contrast & depth (design misfires)

```
Polish Lotus visual design for accessibility and professional demo. Repo: /Users/shauryakansal/Documents/identical-front

FOCUS: Contrast (WCAG AA where possible), shadow depth consistency, text hierarchy (ink/ink-2/ink-3), card borders, focus rings.

TASKS:
1. Audit src/styles.css and Tailwind tokens — fix low-contrast pink-on-pink text.
2. Standardize card elevation (one shadow scale for action cards vs tables).
3. Fix "depth misfires" — misaligned borders, inconsistent border-radius, floating elements.
4. Ensure keyboard focus visible on nav, tables, form controls.
5. Short changelog in UI_POLISH.md.

DO NOT: Rebrand from eAsia/Lotus palette.

SUCCESS CRITERIA:
- [ ] WCAG AA contrast on primary text vs background (spot-check with browser tools)
- [ ] No obvious visual glitches on Home at 1280px
```

---

## E1 — DEMO.md + HIPAA talking points (presentation)

```
Write capstone demo and compliance documentation. No heavy HIPAA implementation — honest communication only.

Repos: identical-front + CSIT321_Project

CREATE:
1. identical-front/DEMO.md — 5-minute demo script:
   - Prereqs (env vars, Supabase keys, Vercel URL, API URL)
   - Click path: login → eAsia project → datasets → viz → AI analysis → run bbbbbbbb-... or new run
   - What NOT to click (mock mode, labels-only until fixed, new project if broken)
   - Fallback if run fails (smoke_process_run.py)
2. COMPLIANCE.md — for judges/companies:
   - Lotus is a public health analytics workbench, NOT a HIPAA-certified product today
   - What we do: RLS, auth, no service keys in browser, Supabase encryption at rest (reference Supabase docs)
   - PHI handling: do not upload real patient identifiers in demo; use seeded eAsia/NHANES demo CSVs
   - Roadmap items for real HIPAA (BAA, audit logs, de-identification pipeline) — bullet list only
3. ARCHITECTURE.md — one diagram: Browser → Vercel → API → Supabase → ML processor

SUCCESS CRITERIA:
- [ ] Teammate can demo from DEMO.md alone on Vercel URL
- [ ] COMPLIANCE.md suitable to read aloud for 30 seconds in a pitch
```

---

## E2 — Smoke tests + CI gate

```
Add minimal automated checks so showcase deploys do not regress.

Repos: both identical-front and CSIT321_Project

TASKS:
1. Backend: pytest or script test — GET /health, GET /projects, POST /pipeline/preview with minimal payload (skip ML or mark @slow).
2. Frontend: add vitest — smoke test api client USE_MOCK detection; optional Playwright single test login → home (if B1 done).
3. GitHub Actions: lint + backend smoke on PR; optional nightly.
4. Document in README how to run locally.

DO NOT: Block merge on flaky Supabase integration initially — use mocks in CI.

SUCCESS CRITERIA:
- [ ] `npm run test` and backend test command exist and pass locally
- [ ] CI workflow file committed
```

---

## Manual work (not for agents — Shaurya / team)

- [ ] Obtain Supabase **anon** + **service_role** keys from password manager; add to Vercel + Railway envs
- [ ] Vercel account: connect GitHub repo `identical-front`
- [ ] Decide AWS vs Vercel with Yuanyi — **default Vercel frontend + Railway API** unless team mandates AWS
- [ ] Record 2-minute screen capture of golden path on Vercel URL for submission
- [ ] Larger cohort CSV for live-run metrics (handoff H1) — upload via Datasets if needed

---

## Quick reference: what "done" means

| Requirement | Owner prompt |
|-------------|--------------|
| Public Vercel URL | A1 |
| Login first | B1 + A2 |
| Supabase secure | A2 |
| Docker local | B2 |
| Dataset state fixed | C1 |
| AI Analysis bugs | C2 |
| createProject / errors | C3 |
| Mobile | D1 |
| UI contrast | D2 |
| Demo script | E1 |
| CI smoke | E2 |
