# Phase 12 Production Beta Launch Evidence

Verified on 2026-07-13 (America/Chicago). No credentials or secret values are recorded here.

## Production state

- Canonical origin: `https://vibe-verse-flame.vercel.app`
- Git revision: `93279629067d9ae1a6ffefa0a9228a9e41498fa6`
- Database: Supabase PostgreSQL 17.6 with pgvector 0.8.2
- Schema: three Drizzle migrations applied; all 15 application and Better Auth tables have RLS enabled with no client policies
- Runtime connection: Supabase transaction pooler on port 6543
- Migration connection: TLS session pooler on port 5432, kept outside Vercel runtime configuration
- Realtime: Vercel-owned Upstash Redis resource `vibeverse-realtime`, free plan, Cleveland primary region, auto-upgrade disabled, connected only to production

## Security verification

- Migration `0002` removed Data API table and sequence access from `anon`, `authenticated`, and `service_role` and hardened migration-owner defaults.
- PostgREST exposes `graphql_public`, not `public`, and its extra search path excludes `public`.
- A request using a valid Supabase publishable key with `Accept-Profile: public` returned HTTP 406 / `PGRST106 Invalid schema: public`.
- All application tables have RLS and no Data API policies.
- Supabase's legacy API keys are disabled. The legacy HS256 signing key surfaced during configuration verification was immediately revoked; the active signing key is ES256.
- Production secrets are encrypted in Vercel. Configured names are `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, and `REDIS_URL`; no value was committed.

## Release gates

- PR #16: migration, lint, typecheck, 106 tests, production build, Playwright/axe, Vercel, and GitGuardian passed.
- PR #17: stale-safe room advance fix, 113 DB-backed tests, production build, Playwright/axe, Vercel, and GitGuardian passed.
- Public health returned HTTP 200 with `{ "ok": true }` and an `x-request-id` header.
- Two disposable users successfully completed sign-up/session, Deezer search, save track, library read, Voyage-backed memory creation, room create/join, queue, vote, and shared snapshots.
- A production-discovered double-advance race was fixed. Two requests with the same rendered expectation now return the same playing item and leave that item playing.
- AI playlist generation completed through Anthropic, Voyage, Deezer, and Supabase with 14 resolved tracks and a non-empty DJ explanation.
- After Redis deployment, an authenticated guest SSE stream received both `queue_updated` and `vote_updated` events published by separate room mutations.
- Every disposable user and cascaded room, playlist, memory, queue, track, and artist row was removed. Final application-table smoke counts were zero.

## Remaining before external beta invitations

- Establish retained automatic backups or encrypted off-site logical backups and complete a restore drill. The current Supabase free plan is suitable for a demo but not the intended recovery posture for external beta data.
- Complete the manual VoiceOver, keyboard-only, 200%/400% zoom, forced-colors, and disabled-user research checks tracked in `BETA_AUDIT.md` and `BETA_RESEARCH.md`.

Phase 12 engineering deployment is complete. External beta invitations remain gated on backup readiness and the manual accessibility/research checks above.
