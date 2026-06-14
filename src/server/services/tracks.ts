import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { savedTracks, tracks } from "@/server/db/schema";
import type { ProviderTrack } from "@/server/music/provider";
import type { TrackDTO } from "@/lib/dto";

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
