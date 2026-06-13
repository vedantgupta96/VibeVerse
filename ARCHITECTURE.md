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
| Database | **PostgreSQL 16 + pgvector** (Docker locally, Neon/Supabase in prod) | Required; pgvector for memory/semantic search |
| ORM | **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) | First-class pgvector column type and SQL-transparent queries; Prisma's vector support requires `Unsupported()` escape hatches |
| Auth | **Better Auth** (email/password + optional Google) with Drizzle adapter | TypeScript-native, owns its schema tables, no vendor lock-in, works in route handlers and middleware |
| Music metadata | **Deezer public API** behind a `MusicProvider` interface | No API key required → zero-friction demo; rich metadata (genres, artwork, 30s previews). Spotify can be added later as a second provider without touching call sites |
| LLM | **Anthropic Claude** via `@anthropic-ai/sdk`, three env-configured tiers (fast / default / strong — see AI Layer) | Playlist generation and taste summaries use the **default** model; the **strong** model is reserved for advanced AI DJ reasoning later. Structured outputs (`output_config.format`) with Zod schemas |
| Embeddings | **Voyage AI — `voyage-4-lite`, 1024 dims** via REST | Anthropic-recommended embedding provider; lite tier is cheap and good enough for memory recall |
| Galaxy v1 | **d3-force + HTML canvas** | 2D first per the brief; R3F deferred |
| Validation | **Zod v3** shared schemas (one schema validates the API input AND types the client call) | Single source of truth between client and server |

## Repository Layout

```
vibeverse/
├── docker-compose.yml            # pgvector/pgvector:pg16 for local dev
├── drizzle.config.ts
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
│   │   │   └── galaxy/page.tsx
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
│   │       └── galaxy/route.ts
│   ├── components/
│   │   ├── ui/                           # shadcn primitives (generated)
│   │   ├── tracks/                       # TrackCard, TrackList, SaveButton, PreviewButton
│   │   ├── memories/                     # MemoryCard, MemoryEditor, MoodPicker
│   │   ├── playlists/                    # PlaylistCard, GenerationProgress
│   │   ├── galaxy/                       # GalaxyCanvas, NodePanel
│   │   └── layout/                       # AppShell, Sidebar, SearchBar
│   ├── server/                           # server-only code (import "server-only")
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
│   │   │   └── embeddings.ts             # embed(texts) → Voyage AI
│   │   └── services/                     # business logic, called by route handlers
│   │       ├── library.ts                # save/unsave/upsert track+artist
│   │       ├── memories.ts               # CRUD + embedding + semantic search
│   │       ├── playlists.ts              # generation orchestration + persistence
│   │       ├── taste.ts                  # aggregation + profile persistence
│   │       └── galaxy.ts                 # node/edge graph building
│   ├── lib/
│   │   ├── api-client.ts                 # typed fetch wrapper for client components
│   │   ├── schemas/                      # Zod schemas shared by client + server
│   │   │   ├── search.ts, memory.ts, playlist.ts, taste.ts, galaxy.ts
│   │   ├── errors.ts                     # ApiError class + error envelope helpers
│   │   └── utils.ts
│   ├── hooks/                            # useSearch, useLibrary, useMemories, ...
│   ├── stores/                           # zustand: usePlayerStore, useGalaxyStore
│   └── middleware.ts                     # auth gate for /(app) routes
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

## Auth

- Better Auth instance in `server/auth.ts` with the Drizzle adapter; tables generated by `npx @better-auth/cli generate` into `schema.ts`.
- Catch-all handler at `app/api/auth/[...all]/route.ts`.
- `middleware.ts` redirects unauthenticated requests on `/(app)` routes to `/login` (cookie presence check); real session validation happens in route handlers/services via `auth.api.getSession({ headers })`.
- Helper `requireUser(headers): Promise<User>` in `server/auth.ts` throws `ApiError("UNAUTHORIZED", 401)` — first line of every protected service call path.
- Google OAuth enabled only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; UI hides the button otherwise.

## Error Handling

One envelope everywhere (defined in `lib/errors.ts`, documented in `API_CONTRACTS.md`):

```ts
class ApiError extends Error {
  // status is derived from the code via the table in API_CONTRACTS.md
  constructor(code: ErrorCode, message?: string, details?: unknown) {...}
}
// route handlers wrap: try { ... } catch (e) { return toErrorResponse(e) }
```

Unexpected errors → `500 INTERNAL` with no stack leakage; log server-side with the route name.

## Environment Variables

`.env.example` (never commit `.env`):

```
DATABASE_URL=postgres://vibeverse:vibeverse@localhost:5432/vibeverse
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
```

Validate at boot with a Zod `env.ts` (fail fast on missing required vars; AI keys required only when AI routes are hit, so the app shell runs without them).

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
volumes:
  pgdata:
```

Workflow: `docker compose up -d` → `npm run db:migrate` (drizzle-kit) → `npm run dev`. Migrations are checked in (`drizzle/` folder); `db:push` allowed only before the first migration is cut.

## Testing Approach (MVP-appropriate)

- **Unit (Vitest)**: services with the DB via a test database, provider/AI mocked at the module boundary; Zod schema edge cases; galaxy graph builder.
- **No E2E in MVP** — manual demo script in `TASKS.md` Phase 9 acceptance instead.
- Deezer and Anthropic are never called in tests; fixtures live next to the mocks.

## Deferred Architecture (do not build yet)

- **Redis + WebSockets** for Vibe Rooms (Phase 10): planned as a separate realtime concern; nothing in the MVP schema should block it.
- **React Three Fiber** galaxy: `GET /api/galaxy` response shape is renderer-agnostic so the 3D upgrade is a frontend-only change.
- **Spotify provider**: implement `MusicProvider` with client-credentials flow; add a `provider` discriminator already present in the schema.
