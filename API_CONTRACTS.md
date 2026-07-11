# API_CONTRACTS.md

All VibeVerse API routes, with exact request/response shapes. Every shape below has a matching Zod schema in `src/lib/schemas/` — the schema is the source of truth; this document mirrors it.

## Conventions

- Base path: `/api`. All routes are Next.js route handlers.
- Auth: session cookie (Better Auth). Every route below **requires auth** unless marked Public.
- Content type: `application/json` both ways.
- Timestamps: ISO 8601 strings in responses.
- IDs: our UUIDs, never provider IDs, except where explicitly named `providerId`.

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

## Auth (Better Auth, Public)

`/api/auth/[...all]` — handled entirely by Better Auth (`signUpEmail`, `signInEmail`, `signOut`, `getSession`, OAuth callbacks). Use its client SDK on the frontend; do not hand-roll these routes.

### `GET /api/me`

Current authenticated user. Also the reference pattern for how protected routes call `requireUser()`.
**200** → `{ "user": { "id": string, "name": string, "email": string, "image": string | null } }`
**401 UNAUTHORIZED** with the standard envelope when no valid session.

## Health (Public)

### `GET /api/health` → **200** `{ "ok": true }` (DB ping included)
