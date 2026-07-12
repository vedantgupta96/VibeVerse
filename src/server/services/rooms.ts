import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { db, isUniqueViolation } from "@/server/db";
import { roomMembers, rooms, user } from "@/server/db/schema";
import { listQueueItems } from "@/server/services/room-queue";
import { assertRoomExists, assertRoomMember } from "@/server/services/room-access";
import { generateRoomVibeSummary } from "@/server/ai/roomVibe";
import { publishRoomEvent } from "@/server/realtime/bus";
import { checkRateLimit } from "@/server/realtime/rate-limit";
import { ApiError } from "@/lib/errors";
import type { Mood } from "@/lib/moods";
import type { RoomMemberDTO, RoomSnapshotDTO, RoomSummaryDTO } from "@/lib/dto";

const ROOMS_PAGE_SIZE = 20;
const CODE_LENGTH = 6;
// Unambiguous charset: excludes I, L, O and 0, 1 (easy to mis-scan/mis-type).
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CODE_ATTEMPTS = 3;

const PRESENCE_WINDOW_MS = 60_000;
const VIBE_COOLDOWN_MS = 60_000;
const REACTION_LIMIT = 5;
const REACTION_WINDOW_MS = 5_000;

/** Pure — 6 chars from an unambiguous charset via crypto.randomInt. Exported for tests. */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[randomInt(CODE_CHARSET.length)];
  }
  return code;
}

function isPresenceActive(lastSeenAt: Date): boolean {
  return Date.now() - lastSeenAt.getTime() < PRESENCE_WINDOW_MS;
}

async function roomToSummary(roomId: string): Promise<RoomSummaryDTO> {
  const [row] = await db
    .select({
      id: rooms.id,
      code: rooms.code,
      name: rooms.name,
      ownerId: rooms.ownerId,
      createdAt: rooms.createdAt,
      memberCount: sql<number>`count(${roomMembers.id})::int`,
      activeCount: sql<number>`count(${roomMembers.id}) filter (where ${roomMembers.lastSeenAt} > now() - interval '60 seconds')::int`,
    })
    .from(rooms)
    .leftJoin(roomMembers, eq(roomMembers.roomId, rooms.id))
    .where(eq(rooms.id, roomId))
    .groupBy(rooms.id);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    ownerId: row.ownerId,
    memberCount: row.memberCount,
    activeCount: row.activeCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Transactional: room row + owner membership. Retries on a room-code collision. */
export async function createRoom(
  userId: string,
  name: string,
): Promise<RoomSummaryDTO> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    try {
      const roomId = await db.transaction(async (tx) => {
        const [room] = await tx
          .insert(rooms)
          .values({ code, name, ownerId: userId })
          .returning({ id: rooms.id });
        await tx.insert(roomMembers).values({ roomId: room.id, userId });
        return room.id;
      });
      return await roomToSummary(roomId);
    } catch (error) {
      if (attempt < MAX_CODE_ATTEMPTS - 1 && isUniqueViolation(error, "rooms_code_key")) {
        continue; // collision on the join code — try another
      }
      throw error;
    }
  }
  throw new ApiError("INTERNAL", "Could not allocate a unique room code");
}

/** Public listing, newest-first, ISO-cursor pagination (like listLibrary). */
export async function listRooms(
  cursor?: string,
  limit = ROOMS_PAGE_SIZE,
): Promise<{ rooms: RoomSummaryDTO[]; nextCursor: string | null }> {
  const rows = await db
    .select({
      id: rooms.id,
      code: rooms.code,
      name: rooms.name,
      ownerId: rooms.ownerId,
      createdAt: rooms.createdAt,
      memberCount: sql<number>`count(${roomMembers.id})::int`,
      activeCount: sql<number>`count(${roomMembers.id}) filter (where ${roomMembers.lastSeenAt} > now() - interval '60 seconds')::int`,
    })
    .from(rooms)
    .leftJoin(roomMembers, eq(roomMembers.roomId, rooms.id))
    .where(cursor ? lt(rooms.createdAt, new Date(cursor)) : undefined)
    .groupBy(rooms.id)
    .orderBy(desc(rooms.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

  return {
    rooms: page.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      ownerId: r.ownerId,
      memberCount: r.memberCount,
      activeCount: r.activeCount,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

/**
 * Resolve a join code to a room and add the caller as a member (idempotent —
 * `onConflictDoNothing`). Publishes `member_joined` only when the row is
 * newly created, so rejoining doesn't spam the room feed.
 */
export async function joinRoomByCode(
  actingUser: { id: string; name: string },
  code: string,
): Promise<RoomSummaryDTO> {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new ApiError("NOT_FOUND", "No room with that code");

  const inserted = await db
    .insert(roomMembers)
    .values({ roomId: room.id, userId: actingUser.id })
    .onConflictDoNothing({ target: [roomMembers.roomId, roomMembers.userId] })
    .returning({ id: roomMembers.id });

  if (inserted.length > 0) {
    await publishRoomEvent(room.id, {
      type: "member_joined",
      userId: actingUser.id,
      name: actingUser.name,
    });
  }

  return roomToSummary(room.id);
}

type RoomRow = typeof rooms.$inferSelect;
type SnapshotMemberRow = {
  userId: string;
  name: string;
  joinedAt: Date;
  lastSeenAt: Date;
};

/** The room row, member rows, and active queue items in one parallel read phase. */
async function fetchSnapshotData(roomId: string, userId: string) {
  const [roomRows, memberRows, activeItems] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1),
    db
      .select({
        userId: roomMembers.userId,
        name: user.name,
        joinedAt: roomMembers.joinedAt,
        lastSeenAt: roomMembers.lastSeenAt,
      })
      .from(roomMembers)
      .innerJoin(user, eq(user.id, roomMembers.userId))
      .where(eq(roomMembers.roomId, roomId))
      .orderBy(asc(roomMembers.joinedAt)),
    listQueueItems(roomId, userId),
  ]);

  return { room: roomRows[0], memberRows, activeItems };
}

/** Pure formatting — assumes `room` exists and the caller's membership has already been decided by callers. */
function assembleSnapshot(
  room: RoomRow,
  userId: string,
  memberRows: SnapshotMemberRow[],
  activeItems: Awaited<ReturnType<typeof listQueueItems>>,
): RoomSnapshotDTO {
  const members: RoomMemberDTO[] = memberRows.map((m) => ({
    userId: m.userId,
    name: m.name,
    joinedAt: m.joinedAt.toISOString(),
    lastSeenAt: m.lastSeenAt.toISOString(),
    active: isPresenceActive(m.lastSeenAt),
  }));

  const nowPlaying = activeItems.find((i) => i.status === "playing") ?? null;
  const queue = activeItems.filter((i) => i.status === "queued");

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    ownerId: room.ownerId,
    isOwner: room.ownerId === userId,
    createdAt: room.createdAt.toISOString(),
    members,
    nowPlaying,
    queue,
    vibeSummary: room.vibeSummary,
    vibeSummaryAt: room.vibeSummaryAt ? room.vibeSummaryAt.toISOString() : null,
  };
}

/**
 * Join-or-refresh entry point for the room page itself (called on mount).
 * Unlike joinRoomByCode, this also bumps `lastSeenAt` for an already-existing
 * membership, since landing on the page is itself a presence signal.
 */
export async function joinRoom(
  actingUser: { id: string; name: string },
  roomId: string,
): Promise<RoomSnapshotDTO> {
  await assertRoomExists(roomId);

  const inserted = await db
    .insert(roomMembers)
    .values({ roomId, userId: actingUser.id })
    .onConflictDoNothing({ target: [roomMembers.roomId, roomMembers.userId] })
    .returning({ id: roomMembers.id });

  if (inserted.length > 0) {
    await publishRoomEvent(roomId, {
      type: "member_joined",
      userId: actingUser.id,
      name: actingUser.name,
    });
  } else {
    await db
      .update(roomMembers)
      .set({ lastSeenAt: sql`now()` })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, actingUser.id)));
  }

  // The caller is now definitely a member (just inserted, or already was) —
  // skip getRoomSnapshot's own 404/403 checks and assemble directly instead
  // of re-validating what this function just established.
  const { room, memberRows, activeItems } = await fetchSnapshotData(
    roomId,
    actingUser.id,
  );
  return assembleSnapshot(room!, actingUser.id, memberRows, activeItems);
}

/** Deletes the membership row. The owner leaving does not delete the room. */
export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  const deleted = await db
    .delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .returning({ id: roomMembers.id });

  if (deleted.length > 0) {
    await publishRoomEvent(roomId, { type: "member_left", userId });
  }
}

/** Heartbeat: no event published — roster freshness comes from refetch/poll. */
export async function touchPresence(userId: string, roomId: string): Promise<void> {
  await assertRoomMember(userId, roomId);

  await db
    .update(roomMembers)
    .set({ lastSeenAt: sql`now()` })
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
}

/** The public, unauthenticated-by-default snapshot path: 404/403 guarded. */
export async function getRoomSnapshot(
  userId: string,
  roomId: string,
): Promise<RoomSnapshotDTO> {
  const { room, memberRows, activeItems } = await fetchSnapshotData(roomId, userId);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");

  const isMember = memberRows.some((m) => m.userId === userId);
  if (!isMember) {
    throw new ApiError("FORBIDDEN", "You're not a member of this room");
  }

  return assembleSnapshot(room, userId, memberRows, activeItems);
}

/**
 * Ephemeral reaction broadcast — no DB write (see DATABASE.md → reactions).
 * Rate-limited per member per room to keep the floating-emoji feed sane.
 */
export async function react(
  actingUser: { id: string; name: string },
  roomId: string,
  mood: Mood,
): Promise<void> {
  await assertRoomMember(actingUser.id, roomId);

  const result = checkRateLimit(
    `reaction:${roomId}:${actingUser.id}`,
    REACTION_LIMIT,
    REACTION_WINDOW_MS,
  );
  if (!result.allowed) {
    throw new ApiError("RATE_LIMITED", "Slow down with the reactions", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }

  await publishRoomEvent(roomId, {
    type: "reaction",
    userId: actingUser.id,
    name: actingUser.name,
    mood,
    at: new Date().toISOString(),
  });
}

/**
 * "Read the room" AI vibe summary, 60s cooldown anchored on `vibeSummaryAt`
 * (clone of taste.ts's cooldown pattern). Context = room name, active member
 * count, now-playing track, and the top 10 queued tracks.
 */
export async function generateRoomVibe(
  userId: string,
  roomId: string,
): Promise<{ vibeSummary: string; generatedAt: string }> {
  await assertRoomMember(userId, roomId);

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");

  if (room.vibeSummaryAt) {
    const elapsed = Date.now() - room.vibeSummaryAt.getTime();
    if (elapsed < VIBE_COOLDOWN_MS) {
      throw new ApiError(
        "RATE_LIMITED",
        "This room's vibe was just read — try again shortly",
        { retryAfterSeconds: Math.ceil((VIBE_COOLDOWN_MS - elapsed) / 1000) },
      );
    }
  }

  const [activeRow] = await db
    .select({
      count: sql<number>`count(*) filter (where ${roomMembers.lastSeenAt} > now() - interval '60 seconds')::int`,
    })
    .from(roomMembers)
    .where(eq(roomMembers.roomId, roomId));

  const items = await listQueueItems(roomId, userId);
  const nowPlaying = items.find((i) => i.status === "playing") ?? null;
  const topQueue = items.filter((i) => i.status === "queued").slice(0, 10);

  const { summary } = await generateRoomVibeSummary({
    roomName: room.name,
    activeCount: activeRow?.count ?? 0,
    nowPlaying: nowPlaying
      ? `${nowPlaying.track.title} by ${nowPlaying.track.artist.name}`
      : null,
    queue: topQueue.map((i) => `${i.track.title} by ${i.track.artist.name}`),
  });

  const generatedAtDate = new Date();
  await db
    .update(rooms)
    .set({ vibeSummary: summary, vibeSummaryAt: generatedAtDate })
    .where(eq(rooms.id, roomId));

  const generatedAt = generatedAtDate.toISOString();
  await publishRoomEvent(roomId, { type: "vibe_summary", summary, generatedAt });
  return { vibeSummary: summary, generatedAt };
}
