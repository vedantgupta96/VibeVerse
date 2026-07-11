import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { artists, savedTracks, tracks } from "@/server/db/schema";
import type { ProviderTrack } from "@/server/music/provider";
import type { TrackDTO } from "@/lib/dto";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Upsert canonical provider metadata without adding the track to a library. */
export async function upsertProviderTrack(
  tx: DbTransaction,
  pt: ProviderTrack,
): Promise<{ trackId: string; artistId: string }> {
  const [artistRow] = await tx
    .insert(artists)
    .values({
      provider: pt.artist.provider,
      providerId: pt.artist.providerId,
      name: pt.artist.name,
      imageUrl: pt.artist.imageUrl,
      genres: pt.artist.genres,
    })
    .onConflictDoUpdate({
      target: [artists.provider, artists.providerId],
      set: {
        name: sql`excluded.name`,
        imageUrl: sql`coalesce(excluded.image_url, ${artists.imageUrl})`,
        genres: sql`case when coalesce(array_length(excluded.genres, 1), 0) > 0 then excluded.genres else ${artists.genres} end`,
      },
    })
    .returning({ id: artists.id });

  const [trackRow] = await tx
    .insert(tracks)
    .values({
      provider: pt.provider,
      providerId: pt.providerId,
      title: pt.title,
      artistId: artistRow.id,
      albumName: pt.albumName,
      albumImageUrl: pt.albumImageUrl,
      previewUrl: pt.previewUrl,
      durationMs: pt.durationMs,
    })
    .onConflictDoUpdate({
      target: [tracks.provider, tracks.providerId],
      set: {
        title: sql`excluded.title`,
        artistId: sql`excluded.artist_id`,
        albumName: sql`excluded.album_name`,
        albumImageUrl: sql`excluded.album_image_url`,
        previewUrl: sql`excluded.preview_url`,
        durationMs: sql`excluded.duration_ms`,
      },
    })
    .returning({ id: tracks.id });

  return { trackId: trackRow.id, artistId: artistRow.id };
}

/**
 * Map provider search results to TrackDTOs, enriching each with our DB id and
 * the requesting user's `saved` flag. Two batched queries regardless of result
 * count (look up persisted tracks by provider id, then the user's saves).
 */
export async function enrichTracks(
  userId: string,
  providerTracks: ProviderTrack[],
): Promise<TrackDTO[]> {
  if (providerTracks.length === 0) return [];

  const providerIds = providerTracks.map((t) => t.providerId);
  const existing = await db
    .select({ id: tracks.id, providerId: tracks.providerId })
    .from(tracks)
    .where(
      and(eq(tracks.provider, "deezer"), inArray(tracks.providerId, providerIds)),
    );

  const idByProviderId = new Map(existing.map((r) => [r.providerId, r.id]));
  const existingIds = existing.map((r) => r.id);

  let savedIds = new Set<string>();
  if (existingIds.length > 0) {
    const saved = await db
      .select({ trackId: savedTracks.trackId })
      .from(savedTracks)
      .where(
        and(
          eq(savedTracks.userId, userId),
          inArray(savedTracks.trackId, existingIds),
        ),
      );
    savedIds = new Set(saved.map((s) => s.trackId));
  }

  return providerTracks.map((pt) => {
    const ourId = idByProviderId.get(pt.providerId) ?? null;
    return {
      id: ourId,
      provider: pt.provider,
      providerId: pt.providerId,
      title: pt.title,
      durationMs: pt.durationMs,
      previewUrl: pt.previewUrl,
      albumName: pt.albumName,
      albumImageUrl: pt.albumImageUrl,
      artist: {
        id: null,
        providerId: pt.artist.providerId,
        name: pt.artist.name,
        imageUrl: pt.artist.imageUrl,
      },
      saved: ourId ? savedIds.has(ourId) : false,
    };
  });
}
