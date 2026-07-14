# ARCHITECTURE.md

How VibeVerse is built. This document makes the stack decisions concrete so implementation requires no guessing. Where `AGENTS.md` offers options ("Prisma or Drizzle"), this file picks one and says why.

## Stack Decisions (final)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15+ (App Router), TypeScript strict** | Required by AGENTS.md; route handlers double as API layer |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Required; shadcn components restyled per `DESIGN_SYSTEM.md` |
| Animation | **Framer Motion** | Page transitions, micro-interactions |
| Server state | **TanStack Query v5** | All `/api` data fetching, caching, optimistic mutations |
| Client state | **Zustand** | Audio preview player, galaxy UI state only — keep it minimal |
| Database | **PostgreSQL 16+ + pgvector** (PostgreSQL 16 locally, Supabase PostgreSQL 17 in production) | Required; pgvector for memory/semantic search |
| ORM | **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) | First-class pgvector column type and SQL-transparent queries; Prisma's vector support requires `Unsupported()` escape hatches |
| Auth | **Better Auth** (email/password + optional Google) with Drizzle adapter | TypeScript-native, owns its schema tables, no vendor lock-in, works in route handlers and the Next.js request proxy |
| Music metadata | **Deezer public API** behind a `MusicProvider` interface | No API key required → zero-friction demo; rich metadata (genres, artwork, 30s previews). Spotify can be added later as a second provider without touching call sites |
| LLM | **Anthropic Claude** via `@anthropic-ai/sdk`, three env-configured tiers (fast / default / strong — see AI Layer) | Playlist generation and taste summaries use the **default** model; the **strong** model is reserved for advanced AI DJ reasoning later. Structured outputs (`output_config.format`) with Zod schemas |
| Embeddings | **Voyage AI — `voyage-4-lite`, 1024 dims** via REST | Anthropic-recommended embedding provider; lite tier is cheap and good enough for memory recall |
| Galaxy v1 | **d3-force + HTML canvas** | 2D first per the brief; R3F deferred |
| Validation | **Zod v3** shared schemas (one schema validates the API input AND types the client call) | Single source of truth between client and server |
| Realtime transport | **Server-Sent Events** (route handler) + **Redis pub/sub** (`ioredis`), in-process fallback when `REDIS_URL` is unset | Vercel can't host WebSocket servers in Next.js route handlers; SSE is a plain HTTP response a route handler can stream. Redis fans events out across instances; docker-compose Redis locally, Upstash-compatible in prod. `ioredis` added in Phase 10 — see Realtime section below |
| Browser/a11y gates | **Playwright + axe-core** | Phase 11 exercises real auth and two-context room behavior without AI/provider calls; axe blocks critical/serious automated findings while manual assistive-technology checks remain required |

## Repository Layout

```
vibeverse/
├── .github/workflows/ci.yml      # DB-backed lint/type/build/unit/E2E gate
├── DEPLOYMENT.md                 # Supabase Postgres + Vercel runbook
├── docker-compose.yml            # pgvector/pgvector:pg16 for local dev
├── drizzle.config.ts
├── playwright.config.ts          # isolated-port, one-worker browser gate
├── e2e/                          # core two-user flow + axe coverage
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx          # landing
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── (app)/                        # authenticated shell (sidebar, player)
│   │   │   ├── layout.tsx
│   │   │   ├── home/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── library/page.tsx
│   │   │   ├── journal/page.tsx
│   │   │   ├── track/[id]/page.tsx
│   │   │   ├── dj/page.tsx
│   │   │   ├── playlist/[id]/page.tsx
│   │   │   ├── taste/page.tsx
│   │   │   ├── galaxy/page.tsx
│   │   │   ├── rooms/page.tsx
│   │   │   └── rooms/[id]/page.tsx
│   │   └── api/
│   │       ├── auth/[...all]/route.ts    # Better Auth handler
│   │       ├── search/route.ts
│   │       ├── tracks/save/route.ts
│   │       ├── tracks/save/[trackId]/route.ts
│   │       ├── library/route.ts
│   │       ├── memories/route.ts
│   │       ├── memories/[id]/route.ts
│   │       ├── memories/search/route.ts
│   │       ├── playlists/route.ts
│   │       ├── playlists/[id]/route.ts
│   │       ├── playlists/generate/route.ts
│   │       ├── taste-profile/route.ts
│   │       ├── taste-profile/refresh/route.ts
│   │       ├── galaxy/route.ts
│   │       └── rooms/                    # 15 routes: create/list/join, [id] snapshot,
│   │                                      # [id]/join|leave|heartbeat|events (SSE),
│   │                                      # [id]/queue(+[itemId]+vote), [id]/advance,
│   │                                      # [id]/reactions, [id]/vibe
│   ├── components/
│   │   ├── ui/                           # shadcn primitives (generated)
│   │   ├── tracks/                       # TrackCard, TrackList, SaveButton, PreviewButton
│   │   ├── memories/                     # MemoryCard, MemoryEditor, MoodPicker
│   │   ├── playlists/                    # PlaylistCard, GenerationProgress
│   │   ├── galaxy/                       # GalaxyCanvas, NodePanel
│   │   ├── rooms/                        # RoomExperience, NowPlayingCard, QueuePanel, ...
│   │   └── layout/                       # AppShell, Sidebar, SearchBar
│   ├── server/                           # server-only code (import "server-only")
│   │   ├── logger.ts                     # redacted structured operational logs
│   │   ├── db/
│   │   │   ├── index.ts                  # drizzle client singleton
│   │   │   └── schema.ts                 # all tables (see DATABASE.md)
│   │   ├── auth.ts                       # Better Auth instance
│   │   ├── music/
│   │   │   ├── provider.ts               # MusicProvider interface + DTO types
│   │   │   └── deezer.ts                 # Deezer implementation
│   │   ├── ai/
│   │   │   ├── client.ts                 # Anthropic client singleton
│   │   │   ├── playlist.ts               # generatePlaylistConcept()
│   │   │   ├── taste.ts                  # generateTasteSummary()
│   │   │   ├── roomVibe.ts               # generateRoomVibeSummary() — "read the room"
│   │   │   └── embeddings.ts             # embed(texts) → Voyage AI
│   │   ├── realtime/                     # bus.ts (Redis/in-process), sse.ts, rate-limit.ts
│   │   └── services/                     # business logic, called by route handlers
│   │       ├── library.ts                # save/unsave/upsert track+artist
│   │       ├── memories.ts               # CRUD + embedding + semantic search
│   │       ├── playlists.ts              # generation orchestration + persistence
│   │       ├── taste.ts                  # aggregation + profile persistence
│   │       ├── galaxy.ts                 # node/edge graph building
│   │       ├── rooms.ts                  # room CRUD, presence, reactions, AI vibe
│   │       └── room-queue.ts             # queue add/remove/vote/advance
│   ├── lib/
│   │   ├── api-client.ts                 # typed fetch wrapper for client components
│   │   ├── realtime.ts                   # client-safe RoomEvent union (SSE payload shapes)
│   │   ├── schemas/                      # Zod schemas shared by client + server
│   │   │   ├── search.ts, memory.ts, playlist.ts, taste.ts, galaxy.ts, room.ts
│   │   ├── errors.ts                     # ApiError class + error envelope helpers
│   │   └── utils.ts
│   ├── hooks/                            # useSearch, useLibrary, useMemories, useRooms, useRoom, ...
│   ├── stores/                           # zustand: usePlayerStore, useGalaxyStore
│   └── proxy.ts                          # request IDs + cookie-presence page gate
└── .env.example
```

Rules: route handlers stay thin (parse → call service → respond); all DB and provider access lives in `src/server/`; nothing in `src/server/` is imported by client components (enforce with the `server-only` package).

## Request Flow

```
Client component
  → hooks/useX (TanStack Query)
    → lib/api-client (fetch, parses error envelope)
      → app/api/x/route.ts        (Zod-validate input, resolve session)
        → server/services/x.ts    (business logic)
          → server/db | server/music | server/ai
```

## Music Provider Abstraction

One interface, one implementation in MVP. All normalization to our DTOs happens inside the provider so the rest of the app never sees Deezer's response shapes.

```ts
// server/music/provider.ts
export interface ProviderTrack {
  provider: "deezer";
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artist: ProviderArtist;
}
export interface ProviderArtist {
  provider: "deezer";
  providerId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];          // Deezer: fetched from artist/album genre endpoints, may be []
}
export interface MusicProvider {
  searchTracks(q: string, limit?: number): Promise<ProviderTrack[]>;
  searchArtists(q: string, limit?: number): Promise<ProviderArtist[]>;
  getTrack(providerId: string): Promise<ProviderTrack | null>;
}
```

Deezer specifics: base `https://api.deezer.com`; endpoints `/search?q=`, `/search/artist?q=`, `/track/{id}`. No auth. Genres come from the album/artist objects when present; treat genres as best-effort. Add a 5 s timeout and map failures to `ApiError("PROVIDER_UNAVAILABLE")`.

`getTrack(providerId)` is the canonical-metadata path for the save flow (`POST /api/tracks/save` sends `provider` + `providerId` only; the server re-fetches and normalizes before persisting — clients never supply metadata). On Deezer this means `/track/{id}` plus, when genres are needed, one follow-up `/album/{album.id}` fetch; a missing track returns `null`, which the service maps to `404 NOT_FOUND`.

## AI Layer

All Claude calls go through `server/ai/`. Conventions:

- **Models — never hardcode a model ID in a call site.** Three env-configured tiers, exposed from `server/ai/client.ts` as `models.fast | models.default | models.strong`:

  | Env var | Default | MVP usage |
  |---|---|---|
  | `ANTHROPIC_FAST_MODEL` | `claude-haiku-4-5` | Lightweight/latency-sensitive tasks (none wired in MVP) |
  | `ANTHROPIC_DEFAULT_MODEL` | `claude-sonnet-4-6` | **Playlist generation, taste summaries** |
  | `ANTHROPIC_STRONG_MODEL` | `claude-opus-4-8` | Reserved: advanced AI DJ reasoning (post-MVP) |

- **Thinking**: `thinking: { type: "adaptive" }` for the default and strong tiers (Sonnet 4.6 / Opus 4.8+). Do **not** send a `thinking` config to the fast tier when it's Haiku 4.5 (adaptive thinking is a 4.6+ feature). Never pass `temperature`/`top_p`/`top_k` or `budget_tokens` — removed on Opus 4.7+ and will 400.
- **Structured output**: use `client.messages.parse()` with `output_config: { format: zodOutputFormat(Schema) }` (helper from `@anthropic-ai/sdk/helpers/zod`). Never regex-parse model text.
- **Streaming**: playlist generation uses `max_tokens: 16000`; if outputs grow, switch to `.stream()` + `finalMessage()`.
- **Refusals**: check `stop_reason === "refusal"` before reading content; map to `ApiError("AI_REFUSED")`.

### Playlist generation (`server/ai/playlist.ts`)

Single structured-output call on **`models.default`** (no tool loop needed in MVP — resolution happens in our code, which is cheaper and more controllable than tool-calling the provider). The strong tier is reserved for the post-MVP conversational AI DJ:

```ts
const PlaylistConceptSchema = z.object({
  title: z.string(),
  vibeDescription: z.string(),          // 2–4 sentences
  candidates: z.array(z.object({
    artist: z.string(),
    title: z.string(),
    reason: z.string(),                 // one line, user-facing
  })).min(12).max(18),
});
```

System prompt receives: the user prompt, top 10 genres + top 10 artists from their library (SQL aggregation), and up to 5 memories retrieved by embedding similarity to the prompt. Instruct: real, well-known recordings only; favor variety; lean toward but don't restrict to the user's taste. The service then resolves candidates via `musicProvider.searchTracks(`${artist} ${title}`, 1)` with fuzzy acceptance (provider's top hit whose artist name loosely matches), in parallel with `Promise.allSettled`.

### Taste summary (`server/ai/taste.ts`)

Runs on **`models.default`**. Input: SQL-aggregated stats (genre counts, artist counts, mood counts, memory snippets). Output schema: `{ summary: string, listenerArchetype: string, traits: string[] (3–5) }`. The numeric data shown in the UI comes from SQL, not the model.

### Embeddings (`server/ai/embeddings.ts`)

Voyage AI REST: `POST https://api.voyageai.com/v1/embeddings` with `{ model: "voyage-4-lite", input: string[], input_type: "document" | "query", output_dimension: 1024 }`. Use `input_type: "document"` when embedding stored memories, `input_type: "query"` when embedding a semantic-search query. Always pass `output_dimension: 1024` explicitly so vectors match the `vector(1024)` schema regardless of the model's native default. Wrap in `embedDocuments(texts)` / `embedQuery(text)`; on failure throw `EmbeddingUnavailableError` which memory-save catches and logs (memory still saves with null embedding).

### Room vibe (`server/ai/roomVibe.ts`)

Runs on **`models.fast`** (Haiku 4.5) — a "read the room" blurb is a quick glance, not a considered essay, so it doesn't need the default tier's depth. Clones taste.ts's structured-output + cooldown-friendly shape (`{ summary: string }`, 40–500 chars) but sends **no `thinking` and no `output_config.effort`**: Haiku 4.5 doesn't support adaptive thinking (existing rule above) *and*, confirmed against the live API, rejects the `effort` parameter outright (400 "This model does not support the effort parameter") — both knobs are Sonnet/Opus-only. Context = room name, active member count, now-playing track, top 10 queued tracks (all SQL-computed, never invented by the model). Cooldown: 60s, anchored on `rooms.vibe_summary_at`.

## Auth

- Better Auth instance in `server/auth.ts` with the Drizzle adapter; tables generated by `npx @better-auth/cli generate` into `schema.ts`.
- Catch-all handler at `app/api/auth/[...all]/route.ts`.
- `proxy.ts` redirects unauthenticated requests on `/(app)` routes to `/login` (cookie presence check); real session validation happens in route handlers/services via `auth.api.getSession({ headers })`. APIs are never redirected by the proxy.
- Helper `requireUser(headers): Promise<User>` in `server/auth.ts` throws `ApiError("UNAUTHORIZED", 401)` — first line of every protected service call path.
- Google OAuth enabled only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; UI hides the button otherwise.

## Realtime (Vibe Rooms, Phase 10)

**Transport: SSE, not WebSockets.** `PRODUCT_SPEC.md`/`AGENTS.md` originally planned "Redis + WebSockets," but Vercel's serverless route handlers can't host a WebSocket server — there's no persistent process to accept the upgrade. A route handler *can* return a streamed `text/event-stream` response, so Vibe Rooms uses **Server-Sent Events** for server→client push, plain REST mutations for client→server writes (queue/vote/advance/react/vibe), and **Redis pub/sub** to fan events out across serverless instances.

- **`src/lib/realtime.ts`** — the `RoomEvent` union (`member_joined`, `member_left`, `queue_updated`, `vote_updated`, `now_playing`, `reaction`, `vibe_summary`), imported by both the server bus and client hooks. **Thin-event principle**: every event except `reaction` is an invalidation hint, not new state — the client refetches `GET /api/rooms/[id]` on receipt. This means duplicate or out-of-order events are harmless (the snapshot always wins), and there's exactly one serializer for room state (the snapshot query), not one per event type.
- **`src/server/realtime/bus.ts`** — `publishRoomEvent(roomId, event)` / `subscribeToRoom(roomId, handler)`, channel `room:{id}`.
  - **No `REDIS_URL`** → an in-process `Map<channel, Set<handler>>` *is* the whole bus. Full realtime works within a single Node process (the common dev/demo case).
  - **`REDIS_URL` set** → two `ioredis` clients (pub + a dedicated sub — a subscriber connection can't issue other Redis commands), both cached on `globalThis` (same pattern as the `pgPool` singleton in `server/db/index.ts`) so Next.js dev-server HMR reuses them instead of orphaning subscriptions on every reload. The Redis subscriber's `message` handler re-publishes into the same in-process Map, so route handlers only ever register against one local API regardless of backend.
  - Publish failures are caught and logged, never thrown: a queue/vote mutation must still succeed (and return 2xx) even if fan-out hiccups — realtime is a UX enhancement, not a correctness dependency (the DB write already happened).
- **Degradation ladder**: Redis pub/sub (multi-instance) → in-process bus (single instance, e.g. one Vercel invocation or local dev) → 15s `refetchInterval` on the room snapshot query while SSE is disconnected. The fallback is a deliberate, commented deviation from the app's default no-polling `QueryClient` config (`app/providers.tsx`): a room still converges if the stream is blocked entirely (corporate proxy, browser extension, Vercel duration limit). While SSE is healthy, snapshots refresh only once per 60s presence window because heartbeats are deliberately not broadcast; this lets closed tabs become stale in the roster within the promised 90s without redundant 15s polling.
- **SSE route** (`app/api/rooms/[id]/events/route.ts`): `requireUser` + membership check happen *before* the stream opens, so auth/membership failures are ordinary JSON error responses, never a broken stream. Once open: `retry: 3000` field, `: connected` comment, `subscribeToRoom` → `enqueue`, `: ping` comment every 25s, cleanup on `request.signal` abort (guarded against double-close since both the abort listener and the stream's `cancel()` can fire). Headers: `text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`. `export const maxDuration = 300` — Vercel's duration limit would otherwise close a long-lived stream, but `EventSource` auto-reconnects and the client refetches the snapshot on every `open`, so a forced close just looks like a brief reconnect blip.
- **No Last-Event-ID replay.** The server is stateless per connection by design — the client always refetches the room snapshot on `EventSource` `open` (initial connect and every reconnect), so there's nothing to replay and no per-connection state to manage server-side.
- **Presence** doesn't depend on the bus at all: `room_members.last_seen_at` is bumped by a 30s client heartbeat and a room's "active" members are computed as `last_seen_at > now() - 60s` in `services/rooms.ts`. This means presence is correct even in the no-Redis, no-SSE, poll-only degradation case.
- **`ioredis`** is the one new dependency this phase adds (auto-reconnect, a clean pub/sub API, and the client Upstash's docs recommend for their Redis-compatible endpoint — Upstash is the natural managed-Redis choice for a Vercel deployment). It's in maintenance mode upstream, which is an acceptable risk here: the bus abstraction confines any future client swap to `server/realtime/bus.ts` alone.

## Error Handling

One envelope everywhere (defined in `lib/errors.ts`, documented in `API_CONTRACTS.md`):

```ts
class ApiError extends Error {
  // status is derived from the code via the table in API_CONTRACTS.md
  constructor(code: ErrorCode, message?: string, details?: unknown) {...}
}
// route handlers wrap: try { ... } catch (e) { return toErrorResponse(e) }
```

`proxy.ts` accepts only conservative incoming `x-request-id` values (or generates a UUID), forwards the ID to the application, and returns it on page/API responses. Unexpected and known 5xx failures are logged through `server/logger.ts` with route, method, request ID, and a generated error ID; response bodies include only that error ID, never stacks or raw request data. Known 4xx errors are returned without server-failure logging. Production log records are JSON for Vercel ingestion; sensitive-key fields and credential-shaped strings are redacted. A hosted monitoring SDK is deferred until an account, DSN, retention policy, and privacy review exist.

## Environment Variables

`.env.example` (never commit `.env`):

```
DATABASE_URL=postgres://vibeverse:vibeverse@localhost:5432/vibeverse
DATABASE_DIRECT_URL=           # optional; direct production URL for migrations/tooling only
BETTER_AUTH_SECRET=             # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=
ANTHROPIC_FAST_MODEL=claude-haiku-4-5
ANTHROPIC_DEFAULT_MODEL=claude-sonnet-4-6
ANTHROPIC_STRONG_MODEL=claude-opus-4-8
VOYAGE_API_KEY=
VOYAGE_MODEL=voyage-4-lite
GOOGLE_CLIENT_ID=               # optional
GOOGLE_CLIENT_SECRET=           # optional
REDIS_URL=                      # optional; unset → in-process realtime bus (Phase 10)
```

Validate at boot with a Zod `env.ts` (fail fast on missing required vars; AI keys required only when AI routes are hit, so the app shell runs without them).

In production, `DATABASE_URL` is the Supabase transaction-pooler URL (port `6543`) used by the running serverless app. `drizzle.config.ts` uses `DATABASE_DIRECT_URL ?? DATABASE_URL`; `DATABASE_DIRECT_URL` is the session/direct connection (port `5432`) reserved for migrations and administrative tooling. The runtime `node-postgres` pool is finite (`max: 5` in production) with connection and idle timeouts.

Supabase remains a PostgreSQL host, not a browser data layer: the app does not ship the Supabase SDK or expose Data API credentials. Migration `0002` revokes the Supabase Data API roles' privileges on application tables, sequences, and migration-owner functions, applies matching default-privilege restrictions for future objects created by the migration owner (`postgres` in production), and enables RLS on every application table without client policies. Supabase-owned extension functions can retain provider-managed ACLs, so production also removes `public` from PostgREST's exposed schemas and search path. Server routes connect as the PostgreSQL object owner, which retains owner access and bypasses RLS. See `DEPLOYMENT.md` for connection and verification guidance.

## Local Development

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: vibeverse
      POSTGRES_PASSWORD: vibeverse
      POSTGRES_DB: vibeverse
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:                       # Phase 10 — Vibe Rooms realtime fan-out
    image: redis:7-alpine      # optional locally: unset REDIS_URL falls back to the in-process bus
    ports: ["6379:6379"]
volumes:
  pgdata:
```

Workflow: `docker compose up -d` → `npm run db:migrate` (drizzle-kit) → `npm run dev`. Migrations are checked in (`drizzle/` folder); `db:push` allowed only before the first migration is cut.

## Testing Approach

- **Unit (Vitest)**: services with the DB via a test database, provider/AI mocked at the module boundary; Zod schema edge cases; galaxy graph builder.
- **Browser (Playwright)**: Chromium, one worker for deterministic DB/realtime behavior, isolated local port and explicit auth origin. The web server leaves `REDIS_URL` empty to exercise in-process realtime and never calls Anthropic, Voyage, or Deezer in the gated flows.
- **Automated accessibility (axe-core/playwright)**: zero critical/serious violations on the beta routes and states listed in `BETA_AUDIT.md`, including a 390px viewport. Automated scans are partial and do not replace VoiceOver, keyboard, zoom, or disabled-user testing.
- **CI**: pgvector PostgreSQL + Redis service containers; checked-in migrations, lint, typecheck, full DB-backed Vitest, production build, Chromium install, and Playwright/axe.

Phase 11 adds two dev-only dependencies: `@playwright/test` for browser automation and `@axe-core/playwright` for automated accessibility analysis. No product analytics or hosted monitoring SDK was added.
- Deezer and Anthropic are never called in tests; fixtures live next to the mocks.

## Deferred Architecture (do not build yet)

- **React Three Fiber** galaxy: `GET /api/galaxy` response shape is renderer-agnostic so the 3D upgrade is a frontend-only change.
- **Spotify provider**: implement `MusicProvider` with client-credentials flow; add a `provider` discriminator already present in the schema.
- **Conversational AI DJ + voice**: the `models.strong` tier is still reserved and unused; Vibe Rooms' "read the room" blurb (Phase 10) uses `models.fast` for a different job (a quick summary, not a conversation) and doesn't touch this reservation.
- Vibe Rooms follow-ups (Phase 10 shipped the core; explicitly not in this phase): reaction-aware AI vibe context, Last-Event-ID replay, private rooms/room deletion, free-form emoji reactions, host-synced playback, vote-to-skip.
