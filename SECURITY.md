# Lotus — Security (frontend cross-link)

The canonical security & compliance writeup for Lotus lives in the backend
repo because the auth boundary, RLS policies, and seed data all originate
there:

→ [`../UniProjects/CSIT321_Project/SECURITY.md`](../UniProjects/CSIT321_Project/SECURITY.md)

That document covers:

- Supabase Auth (managed bcrypt) and session model
- RLS policies on every table in `public`
- `service_role` usage (backend-only)
- Encryption at rest / in transit
- MFA / TOTP status (manual toggle in the Supabase dashboard)
- Explicit statement that **Lotus is not HIPAA-certified today**
- Roadmap to a production-deployable posture
- The "human dashboard actions" checklist

### Frontend-specific notes

- `src/integrations/supabase/client.ts` currently sets
  `persistSession: false`. Agent **B1** owns flipping this on and wiring
  `setAuthTokenGetter` in `src/lib/api/client.ts` so API requests carry an
  `Authorization: Bearer <jwt>` header. A2 left this untouched per the
  WAVE 1 file-ownership boundary.
- `src/routes/ai-analysis.tsx` and `src/routes/runs.$runId.tsx` reach
  Supabase directly with the anon key. After B1, those calls should
  inherit the user's session automatically through the shared
  `supabase` client.
- No `SUPABASE_SERVICE_ROLE_KEY` is ever referenced from the frontend.
  Build-time env vars are `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` only.
