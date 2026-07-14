# Production Deployment

VibeVerse production uses Supabase-managed PostgreSQL 17 with pgvector and deploys the Next.js application to Vercel. This runbook records the release process without storing account credentials or secrets.

## Architecture boundary

Supabase is the production PostgreSQL and pgvector host only. VibeVerse keeps Drizzle and `node-postgres`, Better Auth, REST + SSE, and the Redis/in-process realtime bus. All data access is server-side. Do not add Supabase Auth, Realtime, Storage, or `@supabase/supabase-js` for this deployment.

## 1. Create and secure the database

1. Create a Supabase project in the intended region and store its database password in an approved secret manager.
2. In Supabase's connection settings, copy both:
   - the **transaction pooler** URL (Supavisor, normally port `6543`) for serverless runtime traffic;
   - the **direct** PostgreSQL URL (normally port `5432`) for migrations, `pg_dump`, and other administrative tooling.
3. Append or preserve `sslmode=require` on production URLs.

For the `node-postgres` runtime URL, also append `uselibpqcompat=true` (for example, `?sslmode=require&uselibpqcompat=true`). Current `pg` releases otherwise interpret `sslmode=require` as certificate-verifying mode and may reject the Supabase pooler certificate chain. Migration tooling continues to use the provider's standard `sslmode=require` connection string.

The direct endpoint is IPv6 by default. Networks without IPv6 may not reach it; use an IPv4-capable session-pooler connection on port `5432` supplied by Supabase for administrative work rather than substituting the transaction pooler for migrations. The transaction pooler is the safer Vercel runtime path because it absorbs connections across short-lived serverless instances.

Transaction mode does not support named prepared statements. VibeVerse currently uses unnamed `node-postgres` queries and must keep it that way while this runtime URL is in use.

## 2. Run checked-in migrations

Set local shell variables without committing credentials:

```sh
DATABASE_URL="<transaction-pooler-url>"
DATABASE_DIRECT_URL="<direct-url>"
npm run db:migrate
```

`drizzle.config.ts` intentionally chooses `DATABASE_DIRECT_URL ?? DATABASE_URL`, while the running application reads only `DATABASE_URL`. The checked-in migrations create the `vector` extension before the pgvector-backed tables and indexes. Migration `0002` then hardens the server-only access model: it revokes existing and default object privileges from Supabase's `anon`, `authenticated`, and `service_role` roles, revokes public function execution, and enables RLS on every application table without client policies. Run migrations as the PostgreSQL object owner (`postgres` in production); the application uses that same owner identity and therefore retains owner access and bypasses RLS.

After migrating, verify in a controlled SQL session that pgvector is installed, every application table has RLS enabled, and the Data API roles have no table, sequence, or function privileges in `public`. Do not add client policies unless the architecture is deliberately changed to introduce a reviewed Supabase Data API use case.

Run migrations from one controlled job, not from every application instance. Before a destructive future migration, take a verified backup and document a forward-fix or rollback plan. Never assume a schema rollback also restores deleted data.

## 3. Configure Vercel

Set these separately for the environments that need them:

- `DATABASE_URL`: Supabase transaction pooler URL with TLS.
- `DATABASE_DIRECT_URL`: direct URL only where migration tooling runs. The application runtime does not need it; avoid exposing administrative credentials more broadly than necessary.
- `BETTER_AUTH_URL`: the canonical deployed origin, including `https://`.
- `BETTER_AUTH_SECRET`: a unique high-entropy production secret.
- `REDIS_URL`: managed Redis-compatible endpoint for multi-instance room fan-out. If absent, room updates degrade to in-process SSE plus snapshot polling and cannot fan out instantly across separate instances.
- Provider/AI credentials only for features being enabled (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, optional Google OAuth credentials).

Keep preview and production databases separate. Do not reuse local/demo credentials or paste secrets into logs, issue trackers, or pull requests.

## 4. Release verification

1. Deploy after migrations complete successfully.
2. Request `GET /api/health`; expect `200 { "ok": true }` and an `x-request-id` response header.
3. Create a throwaway account and verify sign-in, a saved track, and a room create/join flow using two browsers.
4. Check Vercel structured logs by request/error ID. Confirm database connection counts remain bounded and SSE reconnects rather than permanently dropping.
5. Confirm current Supabase backups/PITR settings match the release's recovery objective and perform periodic restore drills to a non-production project.

## Rollback cautions

- Roll application code back through Vercel only when the previous version is compatible with the migrated schema.
- Prefer backward-compatible, expand/contract database changes. A code rollback cannot undo data transformations.
- Restore a database backup only after isolating writes and confirming the recovery point; a restore can discard newer user data.
- Rotate credentials immediately if a connection string is exposed.

For beta, structured Vercel logs are the monitoring baseline. A hosted error monitor such as Sentry is a later optional integration once a project, DSN, retention policy, and privacy review exist.
