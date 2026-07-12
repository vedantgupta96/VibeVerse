import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roomMembers, rooms } from "@/server/db/schema";
import { ApiError } from "@/lib/errors";

/**
 * Shared authorization primitives for Vibe Rooms, used by services/rooms.ts,
 * services/room-queue.ts, and the SSE route
 * (app/api/rooms/[id]/events/route.ts). Pulled into its own leaf module (no
 * dependents among the room services) so both service files — which
 * otherwise need things from each other (`sortQueueItems`/`listQueueItems`
 * flow rooms.ts <- room-queue.ts) — can share one set of authz checks
 * without creating an import cycle.
 *
 * Argument order is `(userId, roomId)` everywhere in the room services —
 * match it here.
 */

/** Throws NOT_FOUND if the room doesn't exist. */
export async function assertRoomExists(roomId: string): Promise<void> {
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");
}

/** Throws NOT_FOUND (room missing) or FORBIDDEN (not a member). */
export async function assertRoomMember(
  userId: string,
  roomId: string,
): Promise<void> {
  await assertRoomExists(roomId);

  const [member] = await db
    .select({ id: roomMembers.id })
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);
  if (!member) {
    throw new ApiError("FORBIDDEN", "You're not a member of this room");
  }
}
