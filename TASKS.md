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

- [x] Better Auth instance (`server/auth.ts`), Drizzle adapter, email/password; Google conditional on env
- [x] Auth tables — already created in Phase 2 migration `0000`; the adapter points at them (no regeneration)
- [x] `app/api/auth/[...all]/route.ts`; auth client in `lib/auth-client.ts`
- [x] `/login` + `/signup` pages styled per design system (+ shared `(auth)` layout)
- [x] Auth page gate (migrated to Next 16 `proxy.ts` in Phase 11); `requireUser()` helper; `GET /api/me` to exercise it
- [x] `(app)/layout.tsx` AppShell (Sidebar, UserMenu, sign out) + `/home` dashboard; UI primitives (`button`/`input`/`label`)

**Accept:** sign up → land on `/home`; sign out → `/home` redirects to `/login`; API routes 401 without a session. ✓ verified end-to-end via curl.

## Phase 4 — Track/Artist Search

- [x] `MusicProvider` interface + Deezer implementation (5s timeout, `PROVIDER_UNAVAILABLE` mapping, pure normalizers + tests)
- [x] `GET /api/search` (Zod query validation, `requireUser`, `saved`/`id` enrichment via `services/tracks.ts`)
- [x] `lib/api-client.ts` + `useSearch` hook (TanStack Query + `Providers`, 300 ms debounce); `useDebouncedValue`
- [x] `SearchBar`, `TrackCard`, `ArtistCard`, `SearchExperience` (tabs/loading/empty/error); `/search` page; hero search on `/home` + compact `HeaderSearch`
- [x] `PreviewButton` + `usePlayerStore` (single shared audio, one preview at a time) + `PlayerBar`

**Accept:** typing "daft punk" shows real tracks with art; preview plays/pauses; provider failure shows the error state. ✓ verified (live Deezer: 20 tracks/18 artists, preview playback, 401 unauthenticated, 400 on empty query).

## Phase 5 — Save Tracks (Library)

- [x] `services/library.ts` — save flow: re-fetch via `musicProvider.getTrack(providerId)` (client sends `provider` + `providerId` only), then transactional artist/track upsert + save (idempotent). Split into `saveTrackByProviderId` (fetch) + `persistSavedTrack` (DB) for testability; also `unsaveTrack`, `listLibrary`, `getTrackById`
- [x] `POST /api/tracks/save` (201/200), `DELETE /api/tracks/save/[trackId]` (204/404), `GET /api/library` (cursor pagination)
- [x] `SaveButton` with optimistic toggle; `/library` page (`useLibrary` infinite query + empty state); `/track/[id]` detail page
- [x] Vitest: upsert idempotency + cross-user isolation (DB integration, self-skips without a DB)

**Accept:** save from search → appears in `/library`; unsave removes it; saving twice creates one row. ✓ verified end-to-end (201→200 idempotent, library lists/empties, search `saved` flag flips, genres enriched on save, 204/404/400 paths).

## Phase 6 — Music Memory Journal

- [x] `server/ai/embeddings.ts` (Voyage `voyage-4-lite`, `output_dimension: 1024`, `input_type` document/query split; `EmbeddingUnavailableError`, 10s timeout, failure-tolerant)
- [x] `services/memories.ts` — CRUD + embed-on-write (null on failure) + pgvector cosine search (similarity = 1 − distance)
- [x] Routes: `POST/GET /api/memories`, `PATCH/DELETE /api/memories/[id]`, `GET /api/memories/search`
- [x] `MoodPicker` + `MemoryEditor` + `MemoryCard` (inline edit/delete); `TrackMemories` on track detail; `/journal` feed with semantic search box (shared mood module in `lib/moods`)
- [x] Vitest: ownership enforcement + embedding-failure-still-saves (DB integration, embeddings mocked; 19 tests total)

**Accept:** write a memory on a track; find it on `/journal`; semantic query ("college days") surfaces it without keyword overlap (with real key) or degrades gracefully (without). ✓ verified — CRUD + journal feed work; without a key, create saves with null embedding and search returns a handled 502 `AI_UNAVAILABLE` (UI shows "memories still save" message). ✓ live semantic search verified with a real Voyage key: "back in university" (zero keyword overlap) ranks the college-dorm memory first at 0.44 similarity, ~2× the next hit. Note: keyless Voyage accounts are capped at 3 requests/min — add a payment method at dashboard.voyageai.com before demoing rapid memory writes.

## Phase 7 — AI Playlist Generator

- [x] `server/ai/client.ts` (Anthropic singleton; `models.fast/default/strong` from `ANTHROPIC_FAST_MODEL` / `ANTHROPIC_DEFAULT_MODEL` / `ANTHROPIC_STRONG_MODEL`)
- [x] `server/ai/playlist.ts` — structured-output concept generation on `models.default` (Zod schema per `ARCHITECTURE.md`), refusal handling
- [x] `services/playlists.ts` — taste context (SQL aggregates + memory similarity), candidate resolution via provider (`Promise.allSettled`), transactional persistence, `sparse` flag
- [x] Routes: generate / list / detail / delete
- [x] `/dj` page: prompt input, `GenerationProgress`, history; `/playlist/[id]` with per-track reasons + save buttons

**Accept:** "late-night coding in Chicago during winter" → titled playlist with ≥ 10 real, previewable tracks and one-line reasons in < 30 s. ✓ verified live (2026-07-11): that exact prompt produced "Chicago Freeze: Late-Night Code Sessions" — 14 real tracks, 14/14 previewable, taste-aware reasons. First run took 105 s at Sonnet 4.6's default `effort: "high"`; `output_config.effort: "medium"` in `server/ai/playlist.ts` brings it to **22 s** with no visible quality loss.

## Phase 8 — Taste Dashboard

- [x] `services/taste.ts` — SQL aggregations (genres/artists/moods), ≥ 5-track threshold, 2-min cooldown
- [x] `server/ai/taste.ts` — structured summary (summary/archetype/traits)
- [x] Routes: get / refresh
- [x] `/taste` page: `TasteDnaOrb`, summary, genre bars, artist row, mood distribution; empty state under threshold

**Accept:** with ≥ 5 saved tracks, refresh produces a coherent profile; counts match the library; cooldown returns 429. ✓ verified live (2026-07-11): 10-track library → "The Eclectic Archivist" with traits referencing both genres and memories; genre counts reconcile with the library; immediate second refresh → 429. Refresh tuned from 46 s to **17 s** via `effort: "medium"` in `server/ai/taste.ts`.

## Phase 9 — Music Galaxy (2D)

- [x] `services/galaxy.ts` — nodes/edges per `API_CONTRACTS.md`; `GET /api/galaxy`
- [x] `GalaxyCanvas`: d3-force layout, canvas render, pan/zoom, hover labels, click → side panel (artist's saved tracks + memories)
- [x] Empty state; reduced-motion fallback (static layout)
- [x] Vitest: graph builder (weights, shared-genre edges)

**Accept:** 20+ saved tracks across ≥ 3 genres renders clustered constellations at 60 fps; clicking an artist shows their tracks. ✓ verified live against local Postgres + Deezer: 11 saved tracks across 6 genres produce correct genre/artist nodes, weights, and shared-genre cluster edges; empty graph, 401/405, cross-user isolation, and the inspector's lazy memory load all behave; `/galaxy` renders behind auth (307 → login without a session). ✓ canvas render and interactions confirmed in a real browser (2026-07-11).

**MVP demo script (final check):** sign up → search & save 10 tracks → add 3 memories → generate a playlist → refresh Taste DNA → open the galaxy. Zero console errors, all data persisted across reload. ✓ verified live end-to-end (2026-07-11) with real Postgres, Deezer, Anthropic, and Voyage: every step passed through the real HTTP surface; galaxy interactions confirmed in-browser. **The MVP is complete.**

## Phase 10 — Realtime Vibe Rooms

- [x] Infra: `docker-compose.yml` `redis:7-alpine` service; `REDIS_URL` in `lib/env.ts` + `.env.example` (optional); `ioredis` — the one new dependency this phase adds
- [x] DB schema: `rooms`, `room_members`, `room_queue_items` (two partial unique indexes — one `playing` per room, one active track per room, verified against the generated SQL), `room_queue_votes`; migration `0001_luxuriant_human_robot`; `DATABASE.md` updated (reactions deliberately not persisted)
- [x] Realtime core: `lib/realtime.ts` (`RoomEvent` union), `server/realtime/bus.ts` (Redis pub/sub + in-process fallback, `globalThis`-cached like the `pgPool` singleton), `server/realtime/sse.ts` (framing helpers), `server/realtime/rate-limit.ts` (sliding window); unit tests for all four
- [x] Services: `services/rooms.ts` (create/list/join-by-code/join/leave/heartbeat/snapshot/react/generate-vibe) and `services/room-queue.ts` (add/remove/vote/clear-vote/advance, `sortQueueItems` pure comparator); DTOs in `lib/dto.ts`; Zod schemas in `lib/schemas/room.ts`; unit tests (pure functions, schemas) + DB-integration tests (provider mocked at the module boundary)
- [x] 15 API routes under `/api/rooms` (14 REST + 1 SSE), house style throughout
- [x] AI vibe: `server/ai/roomVibe.ts` — "read the room" blurb on `models.fast`, structured output, 60s cooldown; no `thinking` and no `output_config.effort` (Haiku 4.5 rejects the `effort` parameter outright, confirmed against the live API)
- [x] SSE route `app/api/rooms/[id]/events/route.ts`: pre-stream 404/403, `retry:`/`: connected`/`: ping` framing, cleanup on abort, no Last-Event-ID replay
- [x] Client: `useRooms`/`useRoom` hooks (snapshot polling + SSE + presence heartbeat + mutations); `RoomList`, `CreateRoomForm`, `JoinByCodeForm`, `RoomExperience`, `NowPlayingCard`, `QueuePanel` (+ `AddTrackInput` typeahead), `ReactionBar`, `ReactionOverlay`, `PresenceRoster`, `VibeSummaryCard`; `/rooms` + `/rooms/[id]` pages; Sidebar nav entry (`Users` icon); authenticated page matcher extended (now in `proxy.ts`)
- [x] Docs: `DATABASE.md`, `API_CONTRACTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md` updated in this change

**Accept:**

- [x] Two browsers, two accounts, one room (created in A, joined by code in B): B in A's roster ≤5s; B inactive ≤90s after closing tab.
- [x] A queues a track via in-room search: appears in B ≤2s without refresh; B's upvote reorders A's queue ≤2s.
- [x] Owner "Next track": now-playing updates both browsers ≤2s; preview plays locally per user.
- [x] Reactions float across browsers ≤2s; 6th within 5s → 429 with a gentle UI notice.
- [x] "Read the room" blurb visible in both browsers ≤10s; retry inside 60s shows cooldown; without `ANTHROPIC_API_KEY` the card degrades, nothing else breaks.
- [x] All of the above with `REDIS_URL` unset (in-process bus); with SSE blocked, the room still converges via the 15s poll.
- [x] `curl -N` shows heartbeats/frames; 403 non-member, 401 no session. Fresh-DB migration clean; lint/typecheck/tests green; all five docs updated in-PR. ✓ verified via curl end-to-end with both `REDIS_URL` set and unset (restarting between): sign-up → create room → join by code → Deezer search → queue → vote → advance → react (429 past the 5th) → AI vibe (429 within cooldown) → `curl -N` events showing `retry:`, `: connected`, `: ping`, and `data:` frames for every event type; Redis mode additionally confirmed via `redis-cli monitor`/`pubsub channels` (subscribe → publish → clean unsubscribe on disconnect). ✓ two isolated Chrome contexts verified the visual/timing criteria on 2026-07-12, including local-only preview state, stale presence after tab close, in-process realtime with `REDIS_URL` unset, and a blocked-SSE vote appearing through the fallback poll in 15.1s.

## Phase 11 — Beta Readiness

- [x] Supabase-managed Postgres readiness without SDK coupling: optional direct migration URL, pooled runtime URL, finite production pool, environment example, and deployment/rollback runbook.
- [x] Operational diagnostics: Next 16 request proxy, safe `x-request-id` propagation, redacted structured logger, error IDs for 5xx responses, and focused tests.
- [x] Accessible shell remediation: skip links/`main` landmarks, labeled nav + active state, and a persistent 4+More mobile navigation with safe-area/player spacing.
- [x] Playwright browser suite for protected-route recovery, signup, and the two-context room create/join/roster/reaction/rate-limit/leave/rejoin journey with no AI/provider calls.
- [x] axe gates for login, signup, authenticated home, rooms list, and joined room on desktop plus login/home/room at 390px.
- [x] GitHub Actions gate with pgvector PostgreSQL + Redis services, migrations, lint, typecheck, DB-backed Vitest, build, and Playwright Chromium.
- [x] Ethical beta measurement and five-session moderated research plans; no behavioral tracking implementation.
- [x] Acceptance verification: lint, typecheck, all 98 DB-backed tests, production build, and all four Playwright/axe tests with `REDIS_URL` unset pass in GitHub Actions. The browser gate runs against the production Next.js build (`next start`) to match the deployed artifact; workflow syntax and `git diff --check` also pass. ✓ verified on 2026-07-12 in PR #15 after the original development-server run exposed preload instability.

**Accept:** code/runbook readiness for Supabase + Vercel without claiming external deployment; correlated/redacted 5xx diagnostics; no unresolved critical/serious automated axe findings on gated states; stable two-user browser flow; manual VoiceOver/zoom/disabled-user checks and account-bound deployment remain explicitly open.

---

## Deferred (post-MVP)

- 3D galaxy (React Three Fiber)
- Conversational AI DJ chat & voice
- Spotify provider + OAuth playback
- Social features
- Vibe Rooms follow-ups: reaction-aware AI vibe context, Last-Event-ID replay, private rooms/room deletion, free-form emoji reactions, host-synced playback, vote-to-skip

## Working Agreements

- One phase per PR/commit-series; update this file's checkboxes in the same change.
- New/changed endpoints must update `API_CONTRACTS.md` in the same PR; schema changes update `DATABASE.md`.
- No new dependencies beyond the stack in `ARCHITECTURE.md` without a note explaining why.
