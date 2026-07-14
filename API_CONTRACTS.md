# API_CONTRACTS.md

All VibeVerse API routes, with exact request/response shapes. Every shape below has a matching Zod schema in `src/lib/schemas/` — the schema is the source of truth; this document mirrors it.

## Conventions

- Base path: `/api`. All routes are Next.js route handlers.
- Auth: session cookie (Better Auth). Every route below **requires auth** unless marked Public.
- Content type: `application/json` both ways.
- Timestamps: ISO 8601 strings in responses.
- IDs: our UUIDs, never provider IDs, except where explicitly named `providerId`.
- Correlation: every application/API response includes `x-request-id`. A caller-supplied ID is preserved only when it is 1–128 characters from the conservative `A-Z a-z 0-9 . _ : -` set and starts alphanumeric; otherwise the proxy generates a UUID.

### Error envelope (all non-2xx responses)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { "fieldErrors": { "content": ["Too long"] } }
  }
}
```

Known 4xx errors keep the shape above and are not logged as server failures. For 5xx-class responses (`INTERNAL`, provider/AI unavailability), the server logs a redacted structured record and adds `details.errorId` plus the same value in `x-error-id`. The error ID is safe to share with support; stack traces, raw request bodies, credentials, prompts, and memory text are never returned.

| Code | Status | When |
|---|---|---|
| `UNAUTHORIZED` | 401 | No/invalid session |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Zod parse failure (`details.fieldErrors` populated) |
| `PROVIDER_UNAVAILABLE` | 502 | Deezer down/timeout |
| `AI_UNAVAILABLE` | 502 | Anthropic/Voyage error |
| `AI_REFUSED` | 422 | Model refused the request |
| `RATE_LIMITED` | 429 | e.g. taste refresh cooldown (`details.retryAfterSeconds`) |
| `INTERNAL` | 500 | Anything else |

### Shared DTOs

```ts
type TrackDTO = {
  id: string;                 // our UUID; for unsaved search results this is null
  provider: "deezer";
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artist: { id: string | null; providerId: string; name: string; imageUrl: string | null };
  saved: boolean;             // for the requesting user
};

type MemoryDTO = {
  id: string;
  content: string;
  mood: Mood | null;          // see enum in PRODUCT_SPEC F4
  track: TrackDTO;
  createdAt: string;
  updatedAt: string;
};
```

---

## Search

### `GET /api/search?q=<string>&type=track|artist` 

`q`: 1–100 chars required; `type` defaults to `track`.

**200** (`type=track`):
```json
{ "tracks": [TrackDTO] }            // max 20
```
**200** (`type=artist`):
```json
{ "artists": [{ "providerId": "27", "name": "Daft Punk", "imageUrl": "...", "genres": ["electronic"] }] }
```

## Library

### `POST /api/tracks/save`

Body — provider reference only. The server re-fetches canonical metadata via `musicProvider.getTrack(providerId)` and normalizes it before persisting; clients never supply track metadata:
```json
{ "provider": "deezer", "providerId": "3135556" }
```
**201** → `{ "track": TrackDTO }` (with our UUIDs, `saved: true`). Idempotent: re-saving returns **200** with the same body.
**404 NOT_FOUND** if the provider doesn't know the ID; **502 PROVIDER_UNAVAILABLE** if the re-fetch fails.

### `DELETE /api/tracks/save/[trackId]`

**204** on success; **404** if the user hadn't saved it.

### `GET /api/library?cursor=<iso>&limit=<1..50>`

Saved tracks newest-first, cursor = `createdAt` of last item.
**200** → `{ "tracks": [TrackDTO], "nextCursor": string | null }`

## Memories

### `POST /api/memories`
```json
{ "trackId": "uuid", "content": "1..2000 chars", "mood": "nostalgic" | null }
```
**201** → `{ "memory": MemoryDTO }`. Track must exist (any user may reference any persisted track; saving the track first is not required but the UI does it).

### `GET /api/memories?trackId=<uuid>&cursor=&limit=`
`trackId` optional (omit for the full journal feed, newest-first).
**200** → `{ "memories": [MemoryDTO], "nextCursor": string | null }`

### `PATCH /api/memories/[id]`
Body: `{ "content"?: string, "mood"?: Mood | null }` (at least one). Re-embeds on content change.
**200** → `{ "memory": MemoryDTO }`

### `DELETE /api/memories/[id]` → **204**

### `GET /api/memories/search?q=<1..200 chars>`
Semantic search (Voyage query embedding + pgvector cosine).
**200** → `{ "memories": [MemoryDTO & { "similarity": number }] }`  // top 10, similarity 0..1
**502 AI_UNAVAILABLE** if embedding the query fails.

## Playlists

### `POST /api/playlists/generate`
```json
{ "prompt": "late-night coding in Chicago during winter" }   // 3..300 chars
```
Synchronous; may take up to ~30 s (client shows progress UI).
**201**:
```json
{
  "playlist": {
    "id": "uuid",
    "title": "Frost Terminal",
    "prompt": "late-night coding in Chicago during winter",
    "vibeDescription": "2–4 sentences from the AI DJ...",
    "createdAt": "...",
    "tracks": [ { "position": 1, "reason": "one-liner", "track": TrackDTO } ],
    "sparse": false          // true when < 6 candidates resolved
  }
}
```
Errors: `AI_UNAVAILABLE`, `AI_REFUSED`, `PROVIDER_UNAVAILABLE` (if resolution fails entirely). Nothing persisted on error.

### `GET /api/playlists` → **200** `{ "playlists": [{ id, title, prompt, vibeDescription, trackCount, createdAt }] }` (user's own, newest-first, max 50)

### `GET /api/playlists/[id]` → **200** same shape as the generate response (owner only, else 403/404)

### `DELETE /api/playlists/[id]` → **204**

## Taste Profile

### `GET /api/taste-profile`
**200**:
```json
{
  "profile": {
    "summary": "paragraph...",
    "listenerArchetype": "Midnight Cartographer",
    "traits": ["..."],
    "topGenres": [{ "name": "electronic", "count": 12 }],
    "topArtists": [{ "id": "uuid", "name": "...", "imageUrl": "...", "count": 4 }],
    "moodDistribution": [{ "mood": "nostalgic", "count": 3 }],
    "generatedAt": "..."
  } | null
}
```
`null` when never generated.

### `POST /api/taste-profile/refresh`
**200** → `{ "profile": ... }` (same shape).
**400 VALIDATION_ERROR** with message "Need at least 5 saved tracks" when below threshold.
**429 RATE_LIMITED** within the 2-minute cooldown.

## Galaxy

### `GET /api/galaxy`
**200**:
```json
{
  "nodes": [
    { "id": "genre:electronic", "kind": "genre", "label": "electronic", "weight": 12 },
    { "id": "artist:<uuid>", "kind": "artist", "label": "Daft Punk",
      "imageUrl": "...", "weight": 4, "trackIds": ["uuid"] }
  ],
  "edges": [
    { "source": "genre:electronic", "target": "artist:<uuid>", "kind": "genre-artist" },
    { "source": "artist:<uuid>", "target": "artist:<uuid>", "kind": "shared-genre", "weight": 2 }
  ],
  "tracks": [TrackDTO]
}
```
`weight` on artist nodes = saved-track count; on genre nodes = total saved tracks in that genre; on shared-genre edges = number of shared genres. Layout (x/y) is **not** included — client computes with d3-force.

`tracks` contains the requesting user's saved-track metadata used by the artist inspector. Memories are not embedded in the graph response; the client loads them lazily for the selected track through the existing `GET /api/memories?trackId=<uuid>` endpoint.

## Vibe Rooms

Realtime collaborative listening rooms (Phase 10). See `ARCHITECTURE.md` → Realtime for the transport (SSE + Redis pub/sub, in-process fallback) and `DATABASE.md` for the schema.

### DTOs

```ts
type RoomSummaryDTO = {
  id: string;
  code: string;             // 6-char join code, e.g. "J8CTPQ"
  name: string;
  ownerId: string;
  memberCount: number;
  activeCount: number;      // lastSeenAt within the last 60s
  createdAt: string;
};

type RoomMemberDTO = {
  userId: string;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
  active: boolean;           // computed: lastSeenAt within the last 60s
};

type RoomQueueItemDTO = {
  id: string;
  status: "queued" | "playing" | "played";
  addedByUserId: string;
  createdAt: string;
  track: TrackDTO;
  voteScore: number;         // SUM of votes for this item
  myVote: 1 | -1 | null;     // the requesting user's own vote
};

type RoomSnapshotDTO = {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  createdAt: string;
  members: RoomMemberDTO[];
  nowPlaying: RoomQueueItemDTO | null;
  queue: RoomQueueItemDTO[];  // status "queued" only, vote-sorted
  vibeSummary: string | null;
  vibeSummaryAt: string | null;
};
```

### Rooms

#### `POST /api/rooms`

Body: `{ "name": "1..80 chars" }`
**201** → `{ "room": RoomSummaryDTO }` (caller becomes owner + first member)

#### `GET /api/rooms?cursor=<iso>&limit=<1..50>`

Public listing (any signed-in user), newest-first.
**200** → `{ "rooms": [RoomSummaryDTO], "nextCursor": string | null }`

#### `POST /api/rooms/join`

Body: `{ "code": "string" }` — trimmed + uppercased before lookup.
**200** → `{ "room": RoomSummaryDTO }`. **404 NOT_FOUND** for an unknown code. Idempotent: rejoining doesn't duplicate membership or re-fire `member_joined`.

#### `GET /api/rooms/[id]`

**200** → `{ "room": RoomSnapshotDTO }`. **403 FORBIDDEN** if the caller isn't a member; **404** if the room doesn't exist.

#### `POST /api/rooms/[id]/join`

Idempotent join-or-refresh, called by the room page on mount. Creates membership if needed (publishing `member_joined`) and always bumps `lastSeenAt`.
**200** → `{ "room": RoomSnapshotDTO }`

#### `POST /api/rooms/[id]/leave`

**204**. The owner leaving does not delete the room (advance just has no one to run it until someone else does — see ARCHITECTURE.md → Risks).

#### `POST /api/rooms/[id]/heartbeat`

Presence heartbeat (client calls every 30s while a room page is open).
**204**. **403 FORBIDDEN** if the caller isn't a member.

#### `GET /api/rooms/[id]/events`

Server-Sent Events stream. See SSE contract below.

### Queue

#### `POST /api/rooms/[id]/queue`

Body: `{ "providerId": "string" }` (Deezer track id; resolved via `musicProvider.getTrack`, same re-fetch contract as `POST /api/tracks/save`).
**201** → `{ "item": RoomQueueItemDTO }`. **400 VALIDATION_ERROR** if that track already has an active (non-played) queue instance in this room. **404** if the provider doesn't know the id.

#### `DELETE /api/rooms/[id]/queue/[itemId]`

Only the member who added the track, or the room owner, may remove it.
**204**. **403 FORBIDDEN** otherwise; **404** if the item doesn't exist.

#### `PUT /api/rooms/[id]/queue/[itemId]/vote`

Body: `{ "value": 1 | -1 }`. Upsert — re-voting changes rather than duplicates a vote.
**200** → `{ "item": RoomQueueItemDTO }`

#### `DELETE /api/rooms/[id]/queue/[itemId]/vote`

Clears the caller's own vote on this item.
**204**

#### `POST /api/rooms/[id]/advance`

Body: `{ "expectedNowPlayingId": "uuid" | null }`, using the now-playing item from the snapshot the owner rendered (`null` when nothing was playing). Owner-only. When the expectation still matches, marks the current `playing` item `played`, promotes the top-ranked `queued` item (vote score desc, then oldest first) to `playing`, or leaves now-playing empty. If another request already changed now-playing, the stale request is idempotent: it returns the actual current item without advancing again. An empty body remains accepted for legacy clients and uses the original unguarded behavior; a supplied body is validated strictly.
**200** → `{ "nowPlaying": RoomQueueItemDTO | null }`. **403 FORBIDDEN** for non-owners.

### Reactions & AI vibe

#### `POST /api/rooms/[id]/reactions`

Body: `{ "mood": Mood }` (the 8 canonical moods from `PRODUCT_SPEC.md` F4 / `lib/moods.ts`). Ephemeral — broadcast only, nothing persisted (see `DATABASE.md`).
**202**. **429 RATE_LIMITED** past 5 reactions per 5s per member per room.

#### `POST /api/rooms/[id]/vibe`

AI "read the room" blurb (`models.fast`, structured output). Context = room name, active member count, now-playing track, top 10 queued tracks.
**200** → `{ "vibeSummary": string, "generatedAt": string }`. **429 RATE_LIMITED** with `details.retryAfterSeconds` inside the 60s cooldown. **422 AI_REFUSED** / **502 AI_UNAVAILABLE** on model failure — the room still works without it.

### SSE contract (`GET /api/rooms/[id]/events`)

- Auth + membership are checked **before** the stream opens: `401` (no session) or `403`/`404` (non-member/unknown room) come back as a normal JSON error response, not a stream.
- On success: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
- Framing: a leading `retry: 3000` field (reconnect delay), then `: connected` immediately, then `: ping` every 25s, then `data: <json>` frames shaped as `RoomEvent` (see `ARCHITECTURE.md` → Realtime for the full union).
- **Events are hints, not state.** Every event except `reaction` (ephemeral, never persisted) should be treated as "something changed — refetch `GET /api/rooms/[id]`," not as the new state itself. The client always re-derives truth from the snapshot endpoint.
- **No Last-Event-ID replay.** The server is stateless per connection. The client refetches the snapshot on every `EventSource` `open` — including the initial connect and every auto-reconnect — so a frame missed during a drop is healed by the next `open`, not replayed. Duplicate or out-of-order events are harmless because a refetch always converges to the same DB truth.
- Degradation: while the stream is disconnected or blocked (proxy, browser extension, Vercel duration limit), the client polls the snapshot every 15s. While SSE is connected, that fast fallback pauses and the snapshot refreshes once per 60s presence window so closed tabs become stale in the roster even though heartbeats are not broadcast.

## Auth (Better Auth, Public)

`/api/auth/[...all]` — handled entirely by Better Auth (`signUpEmail`, `signInEmail`, `signOut`, `getSession`, OAuth callbacks). Use its client SDK on the frontend; do not hand-roll these routes.

### `GET /api/me`

Current authenticated user. Also the reference pattern for how protected routes call `requireUser()`.
**200** → `{ "user": { "id": string, "name": string, "email": string, "image": string | null } }`
**401 UNAUTHORIZED** with the standard envelope when no valid session.

## Health (Public)

### `GET /api/health` → **200** `{ "ok": true }` (DB ping included)
