# Lotus — Copy-paste prompts for Cursor Agents

**How to use:** New Agent chat → copy **one whole block** (from `BEGIN` to `END`) → paste → Enter.

**Repos**
- Frontend: `/Users/shauryakansal/Documents/identical-front`
- Backend: `/Users/shauryakansal/Documents/UniProjects/CSIT321_Project`
- Local stack: `./scripts/dev-stack.sh` (frontend repo)

---

## Run order (cheat sheet)

| When | Open agents | Paste |
|------|-------------|-------|
| **Now** | 4 chats | A1, A2, C1, C3 |
| **After A2** | 2 chats | B1, C2 |
| **Anytime** | 1 chat each | B2, D1, D2, E1, E2 |
| **Coordinator** | 1 chat | Z0 (optional) |

**Minimum for Vercel demo:** A1 → then B1 (after A2) → then C3.

---

## YOUR checklist (you, not agents)

- [ ] Supabase anon + service_role keys in Vercel + Railway env
- [ ] Connect `identical-front` GitHub repo to Vercel
- [ ] Paste production URL into A2/B1 redirect URLs when A1 gives it to you
- [ ] Record 2‑min demo video on Vercel URL

---

## Z0 — COORDINATOR (optional, 1 chat)

```
BEGIN Z0 — COORDINATOR

You are the Lotus capstone coordinator. Read:
- /Users/shauryakansal/Documents/identical-front/AGENT_COPY_PASTE.md
- /Users/shauryakansal/Documents/identical-front/SHOWCASE_PROMPTS.md

I run parallel agents (A1, A2, C1, C3, etc.). Your job:
1. Tell me which agents to start next based on what I say is done.
2. When I paste an agent summary, note merge conflicts (especially __root.tsx, ai-analysis.tsx).
3. Run ./scripts/dev-stack.sh and curl http://localhost:8000/health when I ask for a status check.
4. Give me a bullet list of ONLY what I must do in Vercel/Supabase UI (secrets, redirects, MFA toggle).

Do not implement features unless I say an agent failed.

END Z0
```

---

## RESUME — paste into ANY stuck agent

```
BEGIN RESUME

Continue your previous Lotus task. Re-read the repo state before coding.

1. Summarize what you already changed (files + behavior).
2. List what is still unchecked from your SUCCESS CRITERIA.
3. Finish remaining work; run lint/tests if you added them.
4. End with: how I verify in browser, and any blockers needing my secrets.

Do not restart from scratch unless broken.

END RESUME
```

---

# BATCH 1 — Start these 4 agents now

---

## A1 — Vercel + hosted API (CRITICAL)

```
BEGIN A1

LOTUS CAPSTONE AGENT A1 — Vercel + hosted API
Work in both repos. Commit only when I say "commit". Do not commit secrets.

REPOS
- Frontend: /Users/shauryakansal/Documents/identical-front
- Backend: /Users/shauryakansal/Documents/UniProjects/CSIT321_Project

DO NOT EDIT (other agents)
- src/routes/__root.tsx, src/routes/login*, ai-analysis.tsx, datasets.tsx, projects-store.ts

GOAL
Public Vercel URL for frontend + FastAPI backend hosted separately (Railway/Render/Fly — pick simplest).

CONTEXT
- TanStack Start + Vite; wrangler.jsonc = Cloudflare; team wants VERCEL.
- API: uvicorn api.main:app, POST /runs/{id}/process ~8s, needs SUPABASE_SERVICE_ROLE_KEY + api_storage.
- Frontend build env: VITE_API_BASE_URL, VITE_USE_MOCK_API=false, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- CORS must allow Vercel production + preview URLs.

TASKS
1. Research TanStack Start on Vercel; fallback plan if SSR blocks (document in DEPLOY.md).
2. Deploy frontend to Vercel; list every env var for dashboard.
3. Deploy API via api/Dockerfile to Railway/Render/Fly; persist or re-seed demo data on deploy.
4. Update ALLOWED_ORIGINS / CORS for Vercel URLs in backend.
5. Add vercel.json only if needed; keep local npm run dev working.
6. Write DEPLOY.md: setup, env table, redeploy, rollback, public URLs.
7. Verify: API /health, Vercel loads UI, projects list works against hosted API.

BLOCKERS TO REPORT TO ME
- Missing Vercel/Railway login, env vars, GitHub connect.

SUCCESS CRITERIA
- [ ] Public Vercel URL loads Lotus
- [ ] VITE_API_BASE_URL is hosted API not localhost
- [ ] CORS works in browser
- [ ] DEPLOY.md accurate

When done, reply with: Vercel URL, API URL, env var checklist for my dashboard.

END A1
```

---

## A2 — Supabase Auth + RLS + security

```
BEGIN A2

LOTUS CAPSTONE AGENT A2 — Supabase security
Supabase project: poizespthezmvrfhcyps. Use Supabase skill + MCP if available.
Commit only when I say "commit". Never commit service_role key.

REPOS
- /Users/shauryakansal/Documents/identical-front
- /Users/shauryakansal/Documents/UniProjects/CSIT321_Project

DO NOT EDIT (other agents)
- src/routes/__root.tsx, src/routes/login*, ai-analysis.tsx, datasets.tsx (B1 owns auth UI)

GOAL
Auth foundation: RLS, migrations in git, MFA-ready, SECURITY.md for judges.
Password hashing = Supabase Auth only (no custom password tables).

TASKS
1. Fix empty migration: supabase/migrations/20260521060032_remote_schema.sql — export real schema.
2. Enable email/password auth; document redirect URLs (localhost:8080 + placeholder for Vercel URL).
3. RLS: authenticated read/write for runs/results; service_role backend-only; tighten anon where possible.
4. MFA: document TOTP enable in dashboard; add minimal frontend hooks if needed.
5. Seed script or supabase/seed.sql so demo run bbbbbbbb-0000-0000-0000-000000000002 exists.
6. Write SECURITY.md (encryption, RLS, MFA status, NOT HIPAA-certified today).

DEMO IDS
- Run: bbbbbbbb-0000-0000-0000-000000000002
- Dataset: 510a6e3f-2a6f-4824-99f6-f2cf6efbabeb

BLOCKERS TO REPORT TO ME
- Supabase dashboard access, MFA toggle, redirect URL approval.

SUCCESS CRITERIA
- [ ] Non-empty migration in git
- [ ] RLS tested (anon + authed)
- [ ] SECURITY.md written

END A2
```

---

## C1 — Dataset page state loss (Zhuojin bug)

```
BEGIN C1

LOTUS CAPSTONE AGENT C1 — Dataset page state / cache
Frontend only: /Users/shauryakansal/Documents/identical-front
Commit only when I say "commit".

DO NOT EDIT
- __root.tsx, ai-analysis.tsx, login routes, vercel/deploy files, supabase/

BUG
"While switching pages something is lost on dataset page"

KEY FILES
- src/routes/datasets.tsx
- src/lib/project-work.ts
- src/lib/projects-store.ts
- src/lib/api/projects.ts

TASKS
1. Reproduce: Home → Datasets → configure pipeline → Visualisation → back to Datasets. Document steps.
2. Fix: hydrate from API project on mount; debounced saveProjectWork OR "unsaved changes" on leave.
3. Keep projectId in URL in sync with associated project.
4. Toast on failed save.

SUCCESS CRITERIA
- [ ] Pipeline/dataset selection survives navigation away and back
- [ ] Save or leave-warning works

END C1
```

---

## C3 — P0 demo logic fixes

```
BEGIN C3

LOTUS CAPSTONE AGENT C3 — P0 demo integrity
Primary: /Users/shauryakansal/Documents/identical-front
Backend optional: api/jobs/processor.py
Commit only when I say "commit".

DO NOT EDIT
- __root.tsx auth (B1), full ai-analysis.tsx refactor (C2), datasets.tsx layout (C1)

FIX LIST
1. createProject() in src/lib/projects-store.ts — use api.projects.create() in real API mode (not always __mockCreateProject).
2. src/routes/index.tsx — real loading/error when API hydrate fails (remove hardcoded isLoading=false).
3. ai-analysis.tsx — column mapping: send to API/Supabase OR add banner "Preview only — not applied to ML".
4. If VITE_USE_MOCK_API=true — block Run with clear message.
5. Confirm /ai-analysis/results redirects correctly.

OPTIONAL BACKEND
- processor.py: respect function_mode or document limitation in DEMO.md.

SUCCESS CRITERIA
- [ ] New project persists via API in real mode
- [ ] API down shows error on home
- [ ] Mock mode cannot silently pretend AI works

END C3
```

---

# BATCH 2 — After A2 (auth) is underway

---

## B1 — Login first, not home

```
BEGIN B1

LOTUS CAPSTONE AGENT B1 — Login screens + route guards
Frontend: /Users/shauryakansal/Documents/identical-front
Coordinate with A2 Supabase Auth. Commit only when I say "commit".

DO NOT EDIT
- datasets.tsx (C1), ai-analysis.tsx logic (C2), DEPLOY.md (A1), supabase migrations (A2)

GOAL
Signed out → /login. Signed in → / home. No fake auth via lotus-profile localStorage only.

CURRENT
- lotus-profile in src/routes/__root.tsx
- src/integrations/supabase/client.ts: persistSession false — FIX
- setAuthTokenGetter in src/lib/api/client.ts never wired

TASKS
1. Routes: /login, /signup, /forgot-password — match Lotus design (pink/cream, lotus mark).
2. supabase.auth: signIn, signUp, signOut, getSession, onAuthStateChange; persistSession + autoRefreshToken.
3. Guard: no session → redirect /login (except auth pages).
4. Wire setAuthTokenGetter with access_token for apiFetch.
5. Account menu: real signOut; Settings Security hooks for MFA if A2 ready.

BLOCKERS
- Need Vercel URL for redirect allowlist from A1.

SUCCESS CRITERIA
- [ ] / redirects to /login when logged out
- [ ] Login → home with projects
- [ ] API requests send Authorization
- [ ] Refresh keeps session

END B1
```

---

## C2 — AI Analysis bugs (Zhuojin)

```
BEGIN C2

LOTUS CAPSTONE AGENT C2 — AI Analysis UX bugs
File focus: src/routes/ai-analysis.tsx (+ src/components/ui/slider.tsx if needed)
Commit only when I say "commit".

DO NOT EDIT
- __root.tsx (B1), datasets.tsx (C1), projects-store createProject (C3)

BUGS
1. Age range drag not working (~lines 894-928)
2. Labels-only: continueFromCohort → Run step but runMutation.mutate() only on Method button
3. Missing descriptions on model/method cards

TASKS
1. Fix age dual-range (Radix Slider or fix overlapping native inputs).
2. Labels-only: auto mutate on Run step OR visible "Run Analysis" on Run panel.
3. Add accurate descriptions — read CSIT321_Project/api/jobs/processor.py for what backend actually runs.
4. Disable + tooltip options backend does not implement (clustering v2, etc.).

SUCCESS CRITERIA
- [ ] Age slider works
- [ ] Labels-only reaches /runs/:id
- [ ] Every visible option has honest description

END C2
```

---

# BATCH 3 — Anytime

---

## B2 — Docker all services

```
BEGIN B2

LOTUS CAPSTONE AGENT B2 — Docker full stack
Backend: /Users/shauryakansal/Documents/UniProjects/CSIT321_Project
Frontend: /Users/shauryakansal/Documents/identical-front
Commit only when I say "commit".

DO NOT EDIT
- App route UI files

GOAL
One documented command → API :8000 + frontend :8080 + demo seed.

TASKS
1. Extend docker-compose.yml (frontend service OR documented host-native frontend + compose for API).
2. scripts/docker-up.sh — check .env, bootstrap if empty, print URLs.
3. ALLOWED_ORIGINS includes localhost:8080 and docker frontend host.
4. Link from README and DEPLOY.md.

SUCCESS CRITERIA
- [ ] docker-up (or documented compose) works for new teammate
- [ ] /health OK after up

END B2
```

---

## D1 — Mobile responsive

```
BEGIN D1

LOTUS CAPSTONE AGENT D1 — Mobile responsive
Frontend: /Users/shauryakansal/Documents/identical-front
Commit only when I say "commit".

DO NOT EDIT
- Auth routes (B1), processor.py

PAGES
__root.tsx, index.tsx, datasets.tsx, visualisation.tsx, ai-analysis.tsx, runs.$runId.tsx

TASKS
1. Stack 280px sidebars on sm/md; fix 5-col project table on phone.
2. Nav: icons or bottom bar on small screens.
3. Touch targets ≥44px.
4. Write MOBILE.md with 390/768/1280 notes.

SUCCESS CRITERIA
- [ ] No bad horizontal overflow on Home, Datasets, AI Analysis at 390px width

END D1
```

---

## D2 — UI contrast & depth

```
BEGIN D2

LOTUS CAPSTONE AGENT D2 — UI contrast & depth polish
Frontend: /Users/shauryakansal/Documents/identical-front
Commit only when I say "commit".

DO NOT EDIT
- Auth, API, datasets business logic

FOCUS
src/styles.css, tokens, cards, shadows, focus rings, ink/ink-2/ink-3 contrast (WCAG AA where possible).

TASKS
1. Fix pink-on-pink low contrast.
2. One consistent card shadow scale.
3. Fix border-radius / alignment glitches.
4. UI_POLISH.md changelog.

SUCCESS CRITERIA
- [ ] Primary text readable; Home looks professional at 1280px

END D2
```

---

## E1 — DEMO + compliance docs

```
BEGIN E1

LOTUS CAPSTONE AGENT E1 — Demo & compliance docs
Both repos. Docs only — no feature code unless fixing broken links.
Commit only when I say "commit".

CREATE
1. identical-front/DEMO.md — 5-min script:
   - Env prereqs, Vercel URL, API URL
   - login → eAsia project e1111111-0000-0000-0000-000000000001
   - dataset 510a6e3f-2a6f-4824-99f6-f2cf6efbabeb
   - run bbbbbbbb-0000-0000-0000-000000000002 OR new run
   - What NOT to click
   - Fallback: api/scripts/smoke_process_run.py
2. COMPLIANCE.md — NOT HIPAA-certified; RLS/auth; no real PHI in demo; roadmap bullets
3. ARCHITECTURE.md — Browser → Vercel → API → Supabase → ML

SUCCESS CRITERIA
- [ ] New teammate can demo from DEMO.md alone

END E1
```

---

## E2 — Tests + CI

```
BEGIN E2

LOTUS CAPSTONE AGENT E2 — Smoke tests + CI
Both repos. Commit only when I say "commit".

TASKS
1. Backend: pytest or script — GET /health, GET /projects; optional @slow ML test.
2. Frontend: vitest smoke; optional Playwright if B1 done.
3. .github/workflows — lint + backend smoke on PR.
4. README: how to run tests.

DO NOT
- Block CI on live Supabase initially.

SUCCESS CRITERIA
- [ ] npm run test (or documented equivalent) passes locally
- [ ] CI workflow exists

END E2
```

---

# When you're done — final verification agent

```
BEGIN VERIFY

LOTUS FINAL VERIFICATION
Check the full capstone demo path. Use browser if available.

REPOS: identical-front + CSIT321_Project

CHECKLIST
1. ./scripts/dev-stack.sh — both :8080 and :8000 up
2. Login works (or document if B1 not merged)
3. Home shows projects (not empty lie if API up)
4. Datasets: state survives page switch
5. AI Analysis: age slider, run completes → /runs/:id
6. Vercel URL (if A1 done): same path on production
7. List any failing item with file + suggested owner agent (A1-C3 etc.)

END VERIFY
```

---

*Full reference: `SHOWCASE_PROMPTS.md`*
