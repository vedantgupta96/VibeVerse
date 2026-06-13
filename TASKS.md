# TASKS.md

Implementation plan for the VibeVerse MVP. Phases map to the order in `AGENTS.md`. **Work one phase at a time; each phase ends with its acceptance check passing before the next begins.** Check items off in this file as they land.

Docs to read before any phase: `PRODUCT_SPEC.md` (what), `ARCHITECTURE.md` (how), `DATABASE.md` (schema), `API_CONTRACTS.md` (shapes), `DESIGN_SYSTEM.md` (look).

---

## Phase 1 — Project Setup

- [x] Scaffold Next.js (App Router, TS strict, `src/` dir, Tailwind v4, ESLint)
- [x] Add deps: `drizzle-orm drizzle-kit pg better-auth @anthropic-ai/sdk zod @tanstack/react-query zustand framer-motion d3-force` + shadcn/ui init
- [x] `docker-compose.yml` (pgvector/pgvector:pg16) per `ARCHITECTURE.md`
- [x] `src/lib/env.ts` Zod-validated env loading; `.env.example` checked in
- [x] `lib/errors.ts` (ApiError, error envelope, `toErrorResponse`)
- [x] Design tokens: Tailwind `@theme` from `DESIGN_SYSTEM.md`, fonts (Clash Display, Space Grotesk, JetBrains Mono), starfield layer in app layout
- [x] `GET /api/health`
- [x] Scripts: `dev`, `build`, `db:generate`, `db:migrate`, `db:studio`, `test`

**Accept:** `docker compose up -d && npm run dev` renders a styled placeholder page; `/api/health` returns `{ ok: true }`.

## Phase 2 — Database Schema

- [x] `server/db/schema.ts` — all tables from `DATABASE.md` (incl. `vector(1024)` column); Better Auth core tables hand-defined here (adapter points at them in Phase 3)
- [x] Migration `0000` (drizzle-kit's 0-based first migration): `CREATE EXTENSION IF NOT EXISTS vector;` + tables + indexes (incl. HNSW)
- [x] `server/db/index.ts` drizzle singleton (schema registered)
- [x] Optional: seed script skeleton (`server/db/seed.ts` — real seeding deferred to Phase 3/4)

**Accept:** `npm run db:migrate` succeeds on a fresh DB; `db:studio` shows all tables.

## Phase 3 — Auth

- [ ] Better Auth instance (`server/auth.ts`), Drizzle adapter, email/password; Google conditional on env
- [ ] Generate auth tables into schema + migration
- [ ] `app/api/auth/[...all]/route.ts`; auth client in `lib/`
- [ ] `/login` + `/signup` pages styled per design system
- [ ] `middleware.ts` gate for `/(app)`; `requireUser()` helper
- [ ] `(app)/layout.tsx` AppShell (sidebar, user menu, sign out)

**Accept:** sign up → land on `/home`; sign out → `/home` redirects to `/login`; API routes 401 without a session.

## Phase 4 — Track/Artist Search

- [ ] `MusicProvider` interface + Deezer implementation (timeouts, error mapping)
- [ ] `GET /api/search` (Zod query validation, `saved` flag enrichment)
- [ ] `lib/api-client.ts` + `useSearch` hook (TanStack Query, 300 ms debounce)
- [ ] `SearchBar`, `TrackCard`, search results on `/home` and `/search`
- [ ] `PreviewButton` + `usePlayerStore` (one preview at a time) + `PlayerBar`

**Accept:** typing "daft punk" shows real tracks with art; preview plays/pauses; provider failure shows the error state.

## Phase 5 — Save Tracks (Library)

- [ ] `services/library.ts` — save flow: re-fetch canonical metadata via `musicProvider.getTrack(providerId)` (client sends `provider` + `providerId` only), then transactional artist/track upsert + save (idempotent)
- [ ] `POST /api/tracks/save`, `DELETE /api/tracks/save/[trackId]`, `GET /api/library` (cursor pagination)
- [ ] `SaveButton` with optimistic toggle; `/library` page; `/track/[id]` detail page
- [ ] Vitest: upsert idempotency, cross-user isolation

**Accept:** save from search → appears in `/library`; unsave removes it; saving twice creates one row.

## Phase 6 — Music Memory Journal

- [ ] `server/ai/embeddings.ts` (Voyage `voyage-4-lite`, `output_dimension: 1024`, `input_type` document/query split, failure-tolerant)
- [ ] `services/memories.ts` — CRUD + embed on create/update + pgvector cosine search
- [ ] Routes: `POST/GET /api/memories`, `PATCH/DELETE /api/memories/[id]`, `GET /api/memories/search`
- [ ] `MemoryEditor` + `MoodPicker` on track detail; `/journal` feed with semantic search box
- [ ] Vitest: ownership enforcement, embedding-failure path still saves

**Accept:** write a memory on a track; find it on `/journal`; semantic query ("college days") surfaces it without keyword overlap (with real key) or degrades gracefully (without).

## Phase 7 — AI Playlist Generator

- [ ] `server/ai/client.ts` (Anthropic singleton; `models.fast/default/strong` from `ANTHROPIC_FAST_MODEL` / `ANTHROPIC_DEFAULT_MODEL` / `ANTHROPIC_STRONG_MODEL`)
- [ ] `server/ai/playlist.ts` — structured-output concept generation on `models.default` (Zod schema per `ARCHITECTURE.md`), refusal handling
- [ ] `services/playlists.ts` — taste context (SQL aggregates + memory similarity), candidate resolution via provider (`Promise.allSettled`), transactional persistence, `sparse` flag
- [ ] Routes: generate / list / detail / delete
- [ ] `/dj` page: prompt input, `GenerationProgress`, history; `/playlist/[id]` with per-track reasons + save buttons

**Accept:** "late-night coding in Chicago during winter" → titled playlist with ≥ 10 real, previewable tracks and one-line reasons in < 30 s.

## Phase 8 — Taste Dashboard

- [ ] `services/taste.ts` — SQL aggregations (genres/artists/moods), ≥ 5-track threshold, 2-min cooldown
- [ ] `server/ai/taste.ts` — structured summary (summary/archetype/traits)
- [ ] Routes: get / refresh
- [ ] `/taste` page: `TasteDnaOrb`, summary, genre bars, artist row, mood distribution; empty state under threshold

**Accept:** with ≥ 5 saved tracks, refresh produces a coherent profile; counts match the library; cooldown returns 429.

## Phase 9 — Music Galaxy (2D)

- [ ] `services/galaxy.ts` — nodes/edges per `API_CONTRACTS.md`; `GET /api/galaxy`
- [ ] `GalaxyCanvas`: d3-force layout, canvas render, pan/zoom, hover labels, click → side panel (artist's saved tracks + memories)
- [ ] Empty state; reduced-motion fallback (static layout)
- [ ] Vitest: graph builder (weights, shared-genre edges)

**Accept:** 20+ saved tracks across ≥ 3 genres renders clustered constellations at 60 fps; clicking an artist shows their tracks.

**MVP demo script (final check):** sign up → search & save 10 tracks → add 3 memories → generate a playlist → refresh Taste DNA → open the galaxy. Zero console errors, all data persisted across reload.

---

## Phase 10+ — Deferred (do not start)

- Vibe Rooms (Redis, WebSockets, queues/voting/reactions)
- 3D galaxy (React Three Fiber)
- Conversational AI DJ chat & voice
- Spotify provider + OAuth playback
- Social features

## Working Agreements

- One phase per PR/commit-series; update this file's checkboxes in the same change.
- New/changed endpoints must update `API_CONTRACTS.md` in the same PR; schema changes update `DATABASE.md`.
- No new dependencies beyond the stack in `ARCHITECTURE.md` without a note explaining why.
