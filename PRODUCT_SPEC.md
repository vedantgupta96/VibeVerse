# PRODUCT_SPEC.md

Product specification for the VibeVerse MVP. Read alongside `PROJECT_BRIEF.md` (vision) and `ARCHITECTURE.md` (how it's built). Anything not listed under "MVP Features" below is out of scope for the first implementation.

## Product Summary

VibeVerse is an AI-native music discovery web app. Users search for music, save tracks, attach personal memories to songs, generate playlists from natural-language vibe prompts, view an AI-built Taste DNA profile, and explore their library as a 2D "music galaxy."

## Target User

Music enthusiasts who want a more personal, emotional, and visual relationship with their music library than a standard streaming client offers. Single-player experience in the MVP (no social features yet).

## MVP Features

### F1 — Auth

Users can create an account and sign in with email + password. Optional Google OAuth if credentials are configured.

**User stories**
- As a visitor, I can sign up with email/password and land on the app dashboard.
- As a returning user, I can sign in and see my saved data.
- As a signed-in user, I can sign out.

**Acceptance criteria**
- Unauthenticated users hitting any app page under `/(app)/*` are redirected to `/login`.
- Passwords are never stored in plaintext (handled by Better Auth).
- Sessions persist across browser restarts.
- All `/api/*` routes (except auth and health) return `401` with the standard error envelope when unauthenticated.

### F2 — Track & Artist Search

Users can search the music catalog by free text and see track and artist results with artwork.

**User stories**
- As a user, I can type a query and see matching tracks (title, artist, album art, duration) and artists (name, picture).
- As a user, I can play a ~30-second preview of a track when the provider supplies one.

**Acceptance criteria**
- Search hits `GET /api/search` (see `API_CONTRACTS.md`); the server proxies the music provider — the browser never calls the provider directly.
- Results render within a debounced type-ahead (300 ms debounce).
- Empty query returns an empty state, not an error.
- Provider outages surface as a friendly error state, not a crash.

### F3 — Saved Tracks (Library)

Users can save/unsave tracks. Saving persists canonical track + artist metadata into our database.

**User stories**
- As a user, I can save a track from search results or any track card.
- As a user, I can view my library sorted by most recently saved.
- As a user, I can remove a track from my library.

**Acceptance criteria**
- The client sends only `provider` + `providerId`; the server re-fetches canonical metadata from the music provider and normalizes it before saving (no client-supplied metadata is persisted).
- Saving an already-saved track is idempotent (no duplicates, returns the existing record).
- Track and artist rows are upserted by `(provider, providerId)` so two users saving the same song share one `tracks` row.
- Save state is reflected optimistically in the UI (TanStack Query mutation + rollback on failure).

### F4 — Music Memory Journal

Users attach free-text memories to tracks, optionally tagged with a mood. Memories are embedded for semantic retrieval.

**User stories**
- As a user, I can write a memory on any track ("this was my gym PR song"), optionally choosing a mood tag.
- As a user, I can view, edit, and delete my memories — per track and as a full journal feed.
- As a user, I can semantically search my memories ("songs that remind me of college") and get relevant memories back even without keyword overlap.

**Acceptance criteria**
- Memory content: 1–2000 characters, validated server-side.
- Mood is one of a fixed enum: `joyful | nostalgic | melancholy | energetic | calm | romantic | gritty | dreamy` (or null).
- On create/update, the server generates an embedding (Voyage AI) and stores it in pgvector. Embedding failure must not block saving the memory — the row saves with a null embedding and a background-fill is acceptable (MVP: retry on next read is NOT required; just log it).
- Semantic search uses cosine similarity over embeddings and returns the top 10 matches with their tracks.
- Users can only ever see/edit/delete their own memories (enforced in every query by `userId`).

### F5 — AI Playlist Generator

Users type a vibe prompt; the AI DJ produces a named playlist concept with an explanation and 10–15 concrete tracks resolved against the music provider.

**User stories**
- As a user, I can type "late-night coding in Chicago during winter" and get a playlist with a title, a 2–4 sentence vibe explanation, and real, playable tracks each with a one-line reason.
- As a user, I can see my past generated playlists and open them.
- As a user, I can save any suggested track to my library from the playlist view.

**Acceptance criteria**
- Generation flow (server-side, single request, see `ARCHITECTURE.md` → AI Layer):
  1. Claude (the env-configured **default** model, `ANTHROPIC_DEFAULT_MODEL` — see `ARCHITECTURE.md` → AI Layer) receives the prompt plus a compact summary of the user's taste (top genres/artists from saved tracks, up to 5 semantically relevant memories).
  2. Claude returns a structured playlist concept: title, vibe description, and 12–18 candidate `{ artist, title, reason }` suggestions, via structured outputs (`output_config.format` + Zod schema).
  3. The server resolves each candidate against the music provider search; unresolvable candidates are dropped.
  4. A playlist is persisted with the resolved tracks (target ≥ 10; if fewer than 6 resolve, the playlist is still saved and the UI shows a "sparse result" notice).
- p95 generation time under ~30 s; the UI shows a streaming/progress state, not a frozen button.
- Generation failures return the standard error envelope; nothing partial is persisted on failure.

### F6 — Taste Profile ("Taste DNA")

An AI-generated profile of the user's music identity, computed from saved tracks and memories.

**User stories**
- As a user, I can open my Taste DNA page and see: a written personality summary, top genres with weights, top artists, and a mood distribution.
- As a user, I can manually refresh my profile after my library changes.

**Acceptance criteria**
- Profile requires ≥ 5 saved tracks; below that, show an onboarding empty state prompting the user to save more music.
- Computation: server aggregates genres/artists/moods from the DB, then asks Claude for the written summary (structured output). Aggregations are computed in SQL, not by the LLM.
- One profile row per user, overwritten on refresh, with `generatedAt` shown in the UI.
- Refresh is rate-limited to once per 2 minutes per user.

### F7 — Music Galaxy (2D, v1)

A 2D force-directed visualization of the user's library: artists as planets, genres as constellation hubs, saved tracks as particles around their artist.

**User stories**
- As a user, I can open the Galaxy and see my saved artists as nodes sized by how many of their tracks I saved, clustered by shared genre.
- As a user, I can pan/zoom and hover a node to see its name; clicking an artist opens a side panel with their saved tracks and memories.

**Acceptance criteria**
- Data comes from `GET /api/galaxy` (nodes + edges, precomputed server-side; layout computed client-side with `d3-force`).
- Rendered on `<canvas>` (not SVG/DOM) so 200+ nodes stay at 60 fps.
- Genre hub nodes connect to artists tagged with that genre; artist–artist edges exist when they share ≥ 1 genre.
- Empty library shows a "your universe is empty" state with a CTA to search.
- Three.js/React Three Fiber is explicitly **deferred** — v1 is 2D canvas only.

## Out of Scope for MVP

- Realtime Vibe Rooms (queues, voting, reactions) — Phase 10+.
- 3D/WebGL galaxy — later iteration of F7.
- Voice features, advanced conversational AI DJ chat.
- Full-track playback / streaming-service account linking (Spotify OAuth playback). Previews only.
- Social features (following, sharing, public profiles).
- Mobile apps. The web app must be responsive, but no native targets.

## Page Map

| Route | Page | Feature |
|---|---|---|
| `/` | Marketing/landing (logged-out) or redirect to `/home` | — |
| `/login`, `/signup` | Auth screens | F1 |
| `/home` | Dashboard: search bar, recent saves, quick links | F2/F3 |
| `/search?q=` | Full search results | F2 |
| `/library` | Saved tracks grid | F3 |
| `/journal` | Memory feed + semantic search | F4 |
| `/track/[id]` | Track detail: metadata, memories on this track | F3/F4 |
| `/dj` | AI playlist generator (prompt input + history) | F5 |
| `/playlist/[id]` | Generated playlist detail | F5 |
| `/taste` | Taste DNA profile | F6 |
| `/galaxy` | Music galaxy | F7 |

## Non-Functional Requirements

- **Validation**: every API input validated with Zod; invalid input → `400` with field-level details.
- **Security**: no API keys in client bundles; all third-party calls server-side; per-user data isolation enforced in queries.
- **Performance**: search type-ahead p95 < 800 ms (provider-dependent); page transitions animated but interruptible.
- **Cost control**: LLM calls only on explicit user actions (generate, refresh profile, memory save for embeddings) — never on page load.
- **Demo-friendliness**: app must work with only `DATABASE_URL`, `ANTHROPIC_API_KEY`, and `VOYAGE_API_KEY` set; music search needs no key (Deezer public API).
