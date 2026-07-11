import "server-only";
import {
  and,
  cosineDistance,
  count,
  desc,
  eq,
  isNotNull,
  sql,
} from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import type {
  PlaylistDTO,
  PlaylistSummaryDTO,
  TrackDTO,
} from "@/lib/dto";
import { embedQuery } from "@/server/ai/embeddings";
import {
  generatePlaylistConcept,
  type PlaylistConcept,
} from "@/server/ai/playlist";
import { db } from "@/server/db";
import {
  artists,
  memories,
  playlists,
  playlistTracks,
  savedTracks,
  tracks,
} from "@/server/db/schema";
import { musicProvider } from "@/server/music/deezer";
import type {
  MusicProvider,
  ProviderTrack,
} from "@/server/music/provider";
import { upsertProviderTrack } from "@/server/services/tracks";

const PLAYLIST_LIMIT = 50;
const CONTEXT_LIMIT = 10;
const MEMORY_LIMIT = 5;
const SPARSE_THRESHOLD = 6;

type Candidate = PlaylistConcept["candidates"][number];
export type ResolvedCandidate = Candidate & { track: ProviderTrack };

const FEATURING_PATTERN = /\b(feat(?:uring)?|ft|with|x)\b.*$/i;
const NON_WORD_PATTERN = /[^a-z0-9]+/g;

export function normalizeArtistName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(FEATURING_PATTERN, "")
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(NON_WORD_PATTERN, " ")
    .trim();
}

export function artistLooselyMatches(
  requestedArtist: string,
  providerArtist: string,
): boolean {
  const requested = normalizeArtistName(requestedArtist);
  const actual = normalizeArtistName(providerArtist);
  if (!requested || !actual) return false;
  if (requested === actual || requested.includes(actual) || actual.includes(requested)) {
    return true;
  }

  const requestedTokens = requested.split(" ").filter((token) => token.length > 1);
  const actualTokens = new Set(
    actual.split(" ").filter((token) => token.length > 1),
  );
  return requestedTokens.length > 0 && requestedTokens.every((token) => actualTokens.has(token));
}

export async function resolvePlaylistCandidates(
  candidates: Candidate[],
  provider: MusicProvider = musicProvider,
): Promise<ResolvedCandidate[]> {
  const settled = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const results = await provider.searchTracks(
        `${candidate.artist} ${candidate.title}`,
        1,
      );
      const track = results[0];
      if (!track || !artistLooselyMatches(candidate.artist, track.artist.name)) {
        return null;
      }
      return { ...candidate, track };
    }),
  );

  const rejectedCount = settled.filter((result) => result.status === "rejected").length;
  if (rejectedCount === settled.length) {
    throw new ApiError(
      "PROVIDER_UNAVAILABLE",
      "The music catalog is temporarily unavailable",
    );
  }

  const seen = new Set<string>();
  const resolved: ResolvedCandidate[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled" || !result.value) continue;
    if (seen.has(result.value.track.providerId)) continue;
    seen.add(result.value.track.providerId);
    resolved.push(result.value);
  }

  if (resolved.length === 0) {
    throw new ApiError(
      "PROVIDER_UNAVAILABLE",
      "The music catalog could not match this playlist's suggestions",
    );
  }
  return resolved;
}

async function loadTopGenres(userId: string): Promise<string[]> {
  const result = await db.execute<{ name: string }>(sql`
    select genre as name
    from ${savedTracks}
    inner join ${tracks} on ${tracks.id} = ${savedTracks.trackId}
    inner join ${artists} on ${artists.id} = ${tracks.artistId}
    cross join lateral unnest(${artists.genres}) as genre
    where ${savedTracks.userId} = ${userId}
    group by genre
    order by count(*) desc
    limit ${CONTEXT_LIMIT}
  `);
  return result.rows.map((row) => row.name);
}

async function loadTopArtists(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: artists.name, saves: count(savedTracks.id) })
    .from(savedTracks)
    .innerJoin(tracks, eq(savedTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .where(eq(savedTracks.userId, userId))
    .groupBy(artists.id, artists.name)
    .orderBy(desc(count(savedTracks.id)))
    .limit(CONTEXT_LIMIT);
  return rows.map((row) => row.name);
}

async function loadRecentMemories(userId: string): Promise<string[]> {
  const rows = await db
    .select({ content: memories.content })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(MEMORY_LIMIT);
  return rows.map((row) => row.content);
}

async function loadRelevantMemories(
  userId: string,
  prompt: string,
): Promise<string[]> {
  try {
    const vector = await embedQuery(prompt);
    const distance = cosineDistance(memories.embedding, vector);
    const rows = await db
      .select({ content: memories.content })
      .from(memories)
      .where(and(eq(memories.userId, userId), isNotNull(memories.embedding)))
      .orderBy(distance)
      .limit(MEMORY_LIMIT);
    return rows.length > 0 ? rows.map((row) => row.content) : loadRecentMemories(userId);
  } catch {
    return loadRecentMemories(userId);
  }
}

async function loadTasteContext(userId: string, prompt: string) {
  const [topGenres, topArtists, relevantMemories] = await Promise.all([
    loadTopGenres(userId),
    loadTopArtists(userId),
    loadRelevantMemories(userId, prompt),
  ]);
  return { topGenres, topArtists, memories: relevantMemories };
}

const playlistTrackColumns = {
  position: playlistTracks.position,
  reason: playlistTracks.reason,
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
};

function mapTrack(row: {
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
}): TrackDTO {
  return {
    id: row.trackId,
    provider: "deezer",
    providerId: row.providerId,
    title: row.title,
    durationMs: row.durationMs,
    previewUrl: row.previewUrl,
    albumName: row.albumName,
    albumImageUrl: row.albumImageUrl,
    artist: {
      id: row.artistId,
      providerId: row.artistProviderId,
      name: row.artistName,
      imageUrl: row.artistImageUrl,
    },
    saved: row.savedId !== null,
  };
}

export async function getPlaylist(
  userId: string,
  playlistId: string,
): Promise<PlaylistDTO> {
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .limit(1);
  if (!playlist) throw new ApiError("NOT_FOUND", "Playlist not found");
  if (playlist.userId !== userId) {
    throw new ApiError("FORBIDDEN", "You do not have access to this playlist");
  }

  const rows = await db
    .select(playlistTrackColumns)
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(
      savedTracks,
      and(eq(savedTracks.trackId, tracks.id), eq(savedTracks.userId, userId)),
    )
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(playlistTracks.position);

  return {
    id: playlist.id,
    title: playlist.title,
    prompt: playlist.prompt,
    vibeDescription: playlist.vibeDescription,
    createdAt: playlist.createdAt.toISOString(),
    tracks: rows.map((row) => ({
      position: row.position,
      reason: row.reason,
      track: mapTrack(row),
    })),
    sparse: rows.length < SPARSE_THRESHOLD,
  };
}

export async function listPlaylists(
  userId: string,
): Promise<PlaylistSummaryDTO[]> {
  const rows = await db
    .select({
      id: playlists.id,
      title: playlists.title,
      prompt: playlists.prompt,
      vibeDescription: playlists.vibeDescription,
      trackCount: count(playlistTracks.id),
      createdAt: playlists.createdAt,
    })
    .from(playlists)
    .leftJoin(playlistTracks, eq(playlistTracks.playlistId, playlists.id))
    .where(eq(playlists.userId, userId))
    .groupBy(playlists.id)
    .orderBy(desc(playlists.createdAt))
    .limit(PLAYLIST_LIMIT);

  return rows.map((row) => ({
    ...row,
    trackCount: Number(row.trackCount),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function deletePlaylist(
  userId: string,
  playlistId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .returning({ id: playlists.id });
  return deleted.length > 0;
}

export async function generatePlaylist(
  userId: string,
  prompt: string,
): Promise<PlaylistDTO> {
  const context = await loadTasteContext(userId, prompt);
  const concept = await generatePlaylistConcept(prompt, context);
  const resolved = await resolvePlaylistCandidates(concept.candidates);

  const playlistId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(playlists)
      .values({
        userId,
        title: concept.title,
        prompt,
        vibeDescription: concept.vibeDescription,
      })
      .returning({ id: playlists.id });

    for (const [index, candidate] of resolved.entries()) {
      const { trackId } = await upsertProviderTrack(tx, candidate.track);
      await tx.insert(playlistTracks).values({
        playlistId: created.id,
        trackId,
        position: index + 1,
        reason: candidate.reason,
      });
    }
    return created.id;
  });

  return getPlaylist(userId, playlistId);
}
