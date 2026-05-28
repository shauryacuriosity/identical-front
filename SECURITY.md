# Lotus — Security (frontend)

Canonical security and RLS documentation lives in the backend repo:

→ [`../UniProjects/CSIT321_Project/SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md)

That document covers authentication, RLS, service-role usage, encryption, MFA, and the production roadmap.

### Frontend notes

- `src/integrations/supabase/client.ts` uses `persistSession: true`; `setAuthTokenGetter` in `__root.tsx` attaches the JWT to API requests.
- `src/routes/ai-analysis.tsx` and `src/routes/runs.$runId.tsx` read run data from Supabase with the signed-in user's session.
- `SUPABASE_SERVICE_ROLE_KEY` is never used in the frontend — only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time.
