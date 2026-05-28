# Lotus — Compliance & security posture (for judges)

> **30-second pitch (read aloud):**  
> *"Lotus is a public-health analytics workbench for de-identified cohort research — not a HIPAA-certified product today. Authentication and row-level security run through Supabase; the service role key never reaches the browser. Our demo uses synthetic eAsia/NHANES-style data with no real patient identifiers. Before any regulated deployment we'd need a BAA, audit logging, and a de-identification pipeline — all documented in our roadmap."*

For technical depth, see the canonical backend writeup: [`CSIT321_Project/SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md).

---

## What Lotus is

Lotus is a **research workbench** for exploratory data analysis, visualisation, and ML on public-health cohorts (eAsia metabolic syndrome demo). It is designed for academic capstone demonstration and team collaboration — **not** for storing or processing real Protected Health Information (PHI) in its current form.

---

## What we are NOT claiming

| Statement | Status |
|-----------|--------|
| HIPAA-certified | **No** |
| Business Associate Agreement (BAA) with Supabase or hosts | **Not in place** |
| SOC 2 audit | **Not completed** |
| Suitable for real patient data without additional controls | **No** |

Be explicit with judges and industry reviewers: Lotus demonstrates security **patterns** (auth, RLS, secret separation) appropriate for a capstone — not a production clinical deployment.

---

## What we do today

### Authentication

- **Supabase Auth** manages passwords (bcrypt) and JWT sessions.
- Lotus does not maintain a custom credentials table.
- Demo account: see [`CAPSTONE_DEMO_LOGIN.md`](./CAPSTONE_DEMO_LOGIN.md).
- Sessions use the Supabase anon key in the browser; the **service role key is backend-only** (Railway).

Details: [`SECURITY.md` § Authentication](../UniProjects/CSIT321_Project/SECURITY.md#1-authentication)

### Row Level Security (RLS)

- RLS is **enabled on every table** in `public`.
- Capstone policy model: **"open-read demo"** — any authenticated user can read all runs and results; writes to result tables go through the API service role only.
- `analysis_runs.user_id` defaults to `auth.uid()` so we can tighten to per-user RLS later without a data migration.

Details: [`SECURITY.md` § RLS](../UniProjects/CSIT321_Project/SECURITY.md#2-row-level-security-rls-model)

### Secret handling

| Secret | Location | Never in |
|--------|----------|----------|
| `VITE_SUPABASE_ANON_KEY` | Vercel (browser-safe) | git |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway only | Vercel, git, browser |
| Demo passwords | team doc / password manager | git |

Details: [`SECURITY.md` § Service role](../UniProjects/CSIT321_Project/SECURITY.md#3-service-role-usage) and [`DEPLOY.md`](./DEPLOY.md)

### Encryption

- **At rest:** Supabase Postgres AES-256 (managed).
- **In transit:** TLS 1.2+ (HTTPS everywhere in production).
- **Storage:** Supabase Storage for run artefacts (figures, joblib models).

Reference: [Supabase production security guide](https://supabase.com/docs/guides/platform/going-into-prod#security)

---

## PHI handling in the demo

**Do not upload real patient identifiers** into the hosted demo or share production Supabase keys publicly.

Demo data sources:

- eAsia cohort CSVs under `CSIT321_Project/data/demo/easia/` — NHANES-derived records with synthetic IDs.
- Seeded dataset `510a6e3f-2a6f-4824-99f6-f2cf6efbabeb` and run `bbbbbbbb-0000-0000-0000-000000000002` contain no real PHI.
- Merged demo CSV is a controlled join with no free-text clinical notes or direct identifiers.

If a judge asks "could this hold real hospital data?" — answer honestly: **not without the roadmap items below**.

---

## Roadmap (regulated / production context)

Bullet list only — not implemented in the capstone:

1. **Sign a Supabase BAA** and migrate to a HIPAA-eligible Supabase plan (Team or Enterprise).
2. **Audit logging** — in-database `audit_log` table with triggers on `analysis_runs` / `analysis_predictions`; 7-year retention policy.
3. **De-identification pipeline** for non-demo uploads — strip SEQN-equivalent IDs, hash subject keys per tenant, drop free-text columns before persist.
4. **Key rotation** — quarterly rotation of service role and host env secrets; runbook in `DEPLOY.md`.
5. **Penetration test** scoped to SPA + API + Supabase before any pilot.
6. **Per-user RLS** — flip from open-read demo to `user_id = auth.uid()` (migration stub in `20260528000001_lotus_rls.sql`).
7. **MFA enforcement** — require TOTP for admin roles after dashboard toggle is enabled.
8. **Server-side `function_mode`** — honour labels-only / prediction-only / subgroup-only in `processor.py` (UI already stores the field; processor ignores it today).

Full roadmap with verification steps: [`SECURITY.md` § Roadmap](../UniProjects/CSIT321_Project/SECURITY.md#7-roadmap-to-be-production-deployable-in-a-regulated-context)

---

## Human actions still required

These cannot be automated by agents (dashboard / billing / secrets):

- [ ] Store anon + service_role keys in Vercel and Railway envs (password manager)
- [ ] Apply Supabase migrations and seed — see [`SECURITY.md` § Human dashboard actions](../UniProjects/CSIT321_Project/SECURITY.md#9-human-dashboard-actions)
- [ ] Add Vercel URL to Supabase Auth redirect allowlist
- [ ] Enable MFA (TOTP) toggle when ready for stricter demo
- [ ] Drop anon demo policies after auth (B1) is fully live

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md) | Canonical RLS, auth, encryption, verification |
| [`SECURITY.md`](./SECURITY.md) | Frontend cross-link (no duplicate content) |
| [`DEPLOY.md`](./DEPLOY.md) | Deploy URLs, env vars, secrets placement |
| [`DEMO.md`](./DEMO.md) | 5-minute demo script |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System diagram |
