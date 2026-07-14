import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, isUniqueViolation } from "@/server/db";
import {
  artists,
  roomQueueItems,
  roomQueueVotes,
  rooms,
  savedTracks,
  tracks,
} from "@/server/db/schema";
import { musicProvider } from "@/server/music/deezer";
import { rowToTrackDTO, upsertProviderTrack } from "@/server/services/tracks";
import { assertRoomMember } from "@/server/services/room-access";
import { publishRoomEvent } from "@/server/realtime/bus";
import { ApiError } from "@/lib/errors";
import type { RoomQueueItemDTO } from "@/lib/dto";

type QueueStatus = "queued" | "playing" | "played";

/** Pure comparator: best-voted first, ties broken by insertion order then id. */
export function sortQueueItems<
  T extends { id: string; createdAt: string; voteScore: number },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.voteScore !== a.voteScore) return b.voteScore - a.voteScore;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

type QueueRow = {
  id: string;
  status: string;
  addedByUserId: string;
  createdAt: Date;
  trackId: string;
  provider: string;
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artistId: string;
  artistProviderId: string;
  artistName: string;
  artistImageUrl: string | null;
  savedId: string | null;
  voteScore: number;
  myVote: number | null;
};

function mapQueueRow(row: QueueRow): RoomQueueItemDTO {
  return {
    id: row.id,
    status: row.status as QueueStatus,
    addedByUserId: row.addedByUserId,
    createdAt: row.createdAt.toISOString(),
    track: rowToTrackDTO({
      trackId: row.trackId,
      provider: row.provider,
      providerId: row.providerId,
      title: row.title,
      durationMs: row.durationMs,
      previewUrl: row.previewUrl,
      albumName: row.albumName,
      albumImageUrl: row.albumImageUrl,
      artistId: row.artistId,
      artistProviderId: row.artistProviderId,
      artistName: row.artistName,
      artistImageUrl: row.artistImageUrl,
      saved: row.savedId !== null,
    }),
    voteScore: row.voteScore,
    myVote: row.myVote === 1 || row.myVote === -1 ? row.myVote : null,
  };
}

async function queryQueueRows(
  roomId: string,
  userId: string,
  itemId?: string,
): Promise<QueueRow[]> {
  return db
    .select({
      id: roomQueueItems.id,
      status: roomQueueItems.status,
      addedByUserId: roomQueueItems.addedByUserId,
      createdAt: roomQueueItems.createdAt,
      trackId: tracks.id,
      provider: tracks.provider,
      providerId: tracks.providerId,
      title: tracks.title,
      durationMs: tracks.durationMs,
      previewUrl: tracks.previewUrl,
      albumName: tracks.albumName,
      albumImageUrl: tracks.albumImageUrl,
      artistId: artists.id,
      artistProviderId: artists.providerId,
      artistName: artists.name,
      artistImageUrl: artists.imageUrl,
      savedId: savedTracks.id,
      voteScore: sql<number>`coalesce(sum(${roomQueueVotes.value}), 0)::int`,
      myVote: sql<number | null>`max(${roomQueueVotes.value}) filter (where ${roomQueueVotes.userId} = ${userId})`,
    })
    .from(roomQueueItems)
    .innerJoin(tracks, eq(roomQueueItems.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(
      savedTracks,
      and(eq(savedTracks.trackId, tracks.id), eq(savedTracks.userId, userId)),
    )
    .leftJoin(roomQueueVotes, eq(roomQueueVotes.queueItemId, roomQueueItems.id))
    .where(
      and(
        eq(roomQueueItems.roomId, roomId),
        itemId
          ? eq(roomQueueItems.id, itemId)
          : ne(roomQueueItems.status, "played"),
      ),
    )
    .groupBy(
      roomQueueItems.id,
      tracks.id,
      artists.id,
      savedTracks.id,
    );
}

/** All non-played (queued + playing) items in a room, vote-sorted. */
export async function listQueueItems(
  roomId: string,
  userId: string,
): Promise<RoomQueueItemDTO[]> {
  const rows = await queryQueueRows(roomId, userId);
  return sortQueueItems(rows.map(mapQueueRow));
}

async function getQueueItemDTO(
  roomId: string,
  userId: string,
  itemId: string,
): Promise<RoomQueueItemDTO | null> {
  const rows = await queryQueueRows(roomId, userId, itemId);
  return rows.length > 0 ? mapQueueRow(rows[0]) : null;
}

/**
 * Add a track to a room's queue. Re-fetches canonical metadata via the music
 * provider (same contract as tracks/save), then upserts the shared
 * artist/track rows and inserts the queue item in one transaction — reusing
 * `upsertProviderTrack` from services/tracks.ts. A duplicate active
 * (non-played) instance of the same track is a 400, not a 500: the partial
 * unique index (`room_queue_items_active_track_key`) enforces it at the DB.
 */
export async function addToQueue(
  userId: string,
  roomId: string,
  providerId: string,
): Promise<RoomQueueItemDTO> {
  await assertRoomMember(userId, roomId);

  const pt = await musicProvider.getTrack(providerId);
  if (!pt) {
    throw new ApiError("NOT_FOUND", "That track could not be found");
  }

  let itemId: string;
  try {
    itemId = await db.transaction(async (tx) => {
      const { trackId } = await upsertProviderTrack(tx, pt);
      const [item] = await tx
        .insert(roomQueueItems)
        .values({ roomId, trackId, addedByUserId: userId })
        .returning({ id: roomQueueItems.id });
      return item.id;
    });
  } catch (error) {
    if (isUniqueViolation(error, "room_queue_items_active_track_key")) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "That track is already in the queue",
      );
    }
    throw error;
  }

  const item = await getQueueItemDTO(roomId, userId, itemId);
  if (!item) {
    throw new ApiError("INTERNAL", "Failed to load the queued track");
  }
  await publishRoomEvent(roomId, { type: "queue_updated" });
  return item;
}

/** Only the person who added a track, or the room owner, may remove it. */
export async function removeQueueItem(
  userId: string,
  roomId: string,
  itemId: string,
): Promise<void> {
  const [room] = await db
    .select({ ownerId: rooms.ownerId })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");

  const [item] = await db
    .select({ addedByUserId: roomQueueItems.addedByUserId })
    .from(roomQueueItems)
    .where(and(eq(roomQueueItems.id, itemId), eq(roomQueueItems.roomId, roomId)))
    .limit(1);
  if (!item) throw new ApiError("NOT_FOUND", "Queue item not found");

  const authorized = room.ownerId === userId || item.addedByUserId === userId;
  if (!authorized) {
    throw new ApiError(
      "FORBIDDEN",
      "Only the person who added this track or the room owner can remove it",
    );
  }

  await db.delete(roomQueueItems).where(eq(roomQueueItems.id, itemId));
  await publishRoomEvent(roomId, { type: "queue_updated" });
}

/** Upsert (idempotent): re-voting changes rather than duplicates a vote. */
export async function castVote(
  userId: string,
  roomId: string,
  itemId: string,
  value: 1 | -1,
): Promise<RoomQueueItemDTO> {
  await assertRoomMember(userId, roomId);

  const [item] = await db
    .select({ id: roomQueueItems.id })
    .from(roomQueueItems)
    .where(and(eq(roomQueueItems.id, itemId), eq(roomQueueItems.roomId, roomId)))
    .limit(1);
  if (!item) throw new ApiError("NOT_FOUND", "Queue item not found");

  await db
    .insert(roomQueueVotes)
    .values({ queueItemId: itemId, userId, value })
    .onConflictDoUpdate({
      target: [roomQueueVotes.queueItemId, roomQueueVotes.userId],
      set: { value, createdAt: sql`now()` },
    });

  const updated = await getQueueItemDTO(roomId, userId, itemId);
  if (!updated) throw new ApiError("NOT_FOUND", "Queue item not found");
  await publishRoomEvent(roomId, { type: "vote_updated", queueItemId: itemId });
  return updated;
}

export async function clearVote(
  userId: string,
  roomId: string,
  itemId: string,
): Promise<void> {
  await assertRoomMember(userId, roomId);

  const [item] = await db
    .select({ id: roomQueueItems.id })
    .from(roomQueueItems)
    .where(and(eq(roomQueueItems.id, itemId), eq(roomQueueItems.roomId, roomId)))
    .limit(1);
  if (!item) throw new ApiError("NOT_FOUND", "Queue item not found");

  await db
    .delete(roomQueueVotes)
    .where(
      and(eq(roomQueueVotes.queueItemId, itemId), eq(roomQueueVotes.userId, userId)),
    );
  await publishRoomEvent(roomId, { type: "vote_updated", queueItemId: itemId });
}

/**
 * Owner-only. Transitions the current `playing` item (if any) to `played`,
 * then promotes the top-ranked `queued` item (per `sortQueueItems`) to
 * `playing`, or leaves now-playing empty if the queue is empty. When the
 * caller supplies the item it rendered (including null), a mismatched current
 * item makes the request a stale/idempotent read instead of a second advance.
 */
export async function advanceNowPlaying(
  userId: string,
  roomId: string,
  expectedNowPlayingId?: string | null,
): Promise<RoomQueueItemDTO | null> {
  const [room] = await db
    .select({ ownerId: rooms.ownerId })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");
  if (room.ownerId !== userId) {
    throw new ApiError("FORBIDDEN", "Only the room owner can advance the queue");
  }

  let newPlayingId: string | null;
  try {
    newPlayingId = await db.transaction(async (tx) => {
      // Serialize advances per room before comparing the caller's rendered
      // expectation. Without this lock, two requests that both saw the same
      // playing item could both pass the guard and consume two queue entries.
      await tx
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .for("update");

      const [current] = await tx
        .select({ id: roomQueueItems.id })
        .from(roomQueueItems)
        .where(
          and(eq(roomQueueItems.roomId, roomId), eq(roomQueueItems.status, "playing")),
        )
        .limit(1);
      const currentPlayingId = current?.id ?? null;

      if (
        expectedNowPlayingId !== undefined &&
        expectedNowPlayingId !== currentPlayingId
      ) {
        return currentPlayingId;
      }

      await tx
        .update(roomQueueItems)
        .set({ status: "played" })
        .where(
          and(eq(roomQueueItems.roomId, roomId), eq(roomQueueItems.status, "playing")),
        );

      const queued = await tx
        .select({
          id: roomQueueItems.id,
          createdAt: roomQueueItems.createdAt,
          voteScore: sql<number>`coalesce(sum(${roomQueueVotes.value}), 0)::int`,
        })
        .from(roomQueueItems)
        .leftJoin(roomQueueVotes, eq(roomQueueVotes.queueItemId, roomQueueItems.id))
        .where(
          and(eq(roomQueueItems.roomId, roomId), eq(roomQueueItems.status, "queued")),
        )
        .groupBy(roomQueueItems.id);

      if (queued.length === 0) return null;

      const [top] = sortQueueItems(
        queued.map((q) => ({
          id: q.id,
          createdAt: q.createdAt.toISOString(),
          voteScore: q.voteScore,
        })),
      );
      await tx
        .update(roomQueueItems)
        .set({ status: "playing" })
        .where(eq(roomQueueItems.id, top.id));
      return top.id;
    });
  } catch (error) {
    if (isUniqueViolation(error, "room_queue_items_one_playing_key")) {
      // Concurrent advance (owner double-click, or two tabs): another
      // transaction already won the race and promoted a different item to
      // `playing`, so this one rolled back entirely. Idempotent recovery —
      // just report whichever item is actually playing now instead of
      // surfacing a raw 500 for what's really just a timing collision.
      const [current] = await db
        .select({ id: roomQueueItems.id })
        .from(roomQueueItems)
        .where(
          and(eq(roomQueueItems.roomId, roomId), eq(roomQueueItems.status, "playing")),
        )
        .limit(1);
      newPlayingId = current?.id ?? null;
    } else {
      throw error;
    }
  }

  const nowPlaying = newPlayingId
    ? await getQueueItemDTO(roomId, userId, newPlayingId)
    : null;
  await publishRoomEvent(roomId, {
    type: "now_playing",
    queueItemId: newPlayingId,
  });
  return nowPlaying;
}
