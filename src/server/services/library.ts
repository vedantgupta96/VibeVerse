import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { artists, savedTracks, tracks } from "@/server/db/schema";
import { musicProvider } from "@/server/music/deezer";
import { ApiError } from "@/lib/errors";
import type { ProviderTrack } from "@/server/music/provider";
import type { TrackDTO } from "@/lib/dto";
import { rowToTrackDTO, upsertProviderTrack } from "@/server/services/tracks";

const LIBRARY_PAGE_SIZE = 30;

/**
 * Persist a provider track (upsert artist + track, then save for the user) in
 * one transaction. Idempotent: re-saving returns `created: false`. Separated
 * from the provider fetch so it's unit-testable without the network.
 */
export async function persistSavedTrack(
  userId: string,
  pt: ProviderTrack,
): Promise<{ track: TrackDTO; created: boolean }> {
  return db.transaction(async (tx) => {
    const { trackId, artistId } = await upsertProviderTrack(tx, pt);

    const inserted = await tx
      .insert(savedTracks)
      .values({ userId, trackId })
      .onConflictDoNothing({
        target: [savedTracks.userId, savedTracks.trackId],
      })
      .returning({ id: savedTracks.id });

    const track: TrackDTO = {
      id: trackId,
      provider: "deezer",
      providerId: pt.providerId,
      title: pt.title,
      durationMs: pt.durationMs,
      previewUrl: pt.previewUrl,
      albumName: pt.albumName,
      albumImageUrl: pt.albumImageUrl,
      artist: {
        id: artistId,
        providerId: pt.artist.providerId,
        name: pt.artist.name,
        imageUrl: pt.artist.imageUrl,
      },
      saved: true,
    };
    return { track, created: inserted.length > 0 };
  });
}

/** Re-fetch canonical metadata from the provider, then persist + save. */
export async function saveTrackByProviderId(
  userId: string,
  providerId: string,
): Promise<{ track: TrackDTO; created: boolean }> {
  const pt = await musicProvider.getTrack(providerId);
  if (!pt) {
    throw new ApiError("NOT_FOUND", "That track could not be found");
  }
  return persistSavedTrack(userId, pt);
}

/** Returns true if a save row was removed, false if it wasn't saved. */
export async function unsaveTrack(
  userId: string,
  trackId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(savedTracks)
    .where(and(eq(savedTracks.userId, userId), eq(savedTracks.trackId, trackId)))
    .returning({ id: savedTracks.id });
  return deleted.length > 0;
}

export async function listLibrary(
  userId: string,
  cursor?: string,
  limit = LIBRARY_PAGE_SIZE,
): Promise<{ tracks: TrackDTO[]; nextCursor: string | null }> {
  const rows = await db
    .select({
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
      savedAt: savedTracks.createdAt,
    })
    .from(savedTracks)
    .innerJoin(tracks, eq(savedTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .where(
      and(
        eq(savedTracks.userId, userId),
        cursor ? lt(savedTracks.createdAt, new Date(cursor)) : undefined,
      ),
    )
    .orderBy(desc(savedTracks.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? page[page.length - 1].savedAt.toISOString()
    : null;

  return {
    tracks: page.map((r) => rowToTrackDTO({ ...r, saved: true })),
    nextCursor,
  };
}

/** Track detail for the /track/[id] page (any persisted track). */
export async function getTrackById(
  userId: string,
  trackId: string,
): Promise<TrackDTO | null> {
  const [row] = await db
    .select({
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
    })
    .from(tracks)
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(
      savedTracks,
      and(eq(savedTracks.trackId, tracks.id), eq(savedTracks.userId, userId)),
    )
    .where(eq(tracks.id, trackId))
    .limit(1);

  if (!row) return null;
  return rowToTrackDTO({ ...row, saved: row.savedId !== null });
}
