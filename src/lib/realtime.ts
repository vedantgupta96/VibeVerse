// Client-safe realtime event types for Vibe Rooms (Phase 10). Imported by both
// the server bus (server/realtime/bus.ts) and client hooks (hooks/useRoom.ts) —
// no "server-only" import here.
//
// Thin-event principle: persisted-state events are invalidation hints only —
// the client refetches the `["room", id]` snapshot on receipt so it always
// converges to DB truth; duplicate/out-of-order events are harmless. Only
// ephemeral data (reactions) and trivial payloads ride the event itself.
// See ARCHITECTURE.md → Realtime and API_CONTRACTS.md → SSE contract.

import type { Mood } from "@/lib/moods";

export type RoomEvent =
  | { type: "member_joined"; userId: string; name: string }
  | { type: "member_left"; userId: string }
  | { type: "queue_updated" }
  | { type: "vote_updated"; queueItemId: string }
  | { type: "now_playing"; queueItemId: string | null }
  | { type: "reaction"; userId: string; name: string; mood: Mood; at: string }
  | { type: "vibe_summary"; summary: string; generatedAt: string };

export type RoomEventType = RoomEvent["type"];
