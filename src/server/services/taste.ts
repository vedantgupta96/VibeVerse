import "server-only";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import type {
  TasteArtistDTO,
  TasteGenreDTO,
  TasteMoodDTO,
  TasteProfileDTO,
} from "@/lib/dto";
import { ApiError } from "@/lib/errors";
import type { Mood } from "@/lib/moods";
import { generateTasteSummary } from "@/server/ai/taste";
import { db } from "@/server/db";
import {
  artists,
  memories,
  savedTracks,
  tasteProfiles,
  tracks,
} from "@/server/db/schema";

const MINIMUM_SAVED_TRACKS = 5;
const PROFILE_COOLDOWN_MS = 2 * 60 * 1_000;
const AGGREGATE_LIMIT = 10;
const MEMORY_LIMIT = 5;
const MEMORY_SNIPPET_LENGTH = 400;

type StoredProfile = typeof tasteProfiles.$inferSelect;

function mapProfile(profile: StoredProfile): TasteProfileDTO {
  return {
    summary: profile.summary,
    listenerArchetype: profile.listenerArchetype,
    traits: profile.traits,
    topGenres: profile.topGenres,
    topArtists: profile.topArtists,
    moodDistribution: profile.moodDistribution,
    generatedAt: profile.generatedAt.toISOString(),
  };
}

export function tasteRefreshRetryAfterSeconds(
  generatedAt: Date,
  now = new Date(),
): number {
  return Math.max(
    0,
    Math.ceil((PROFILE_COOLDOWN_MS - (now.getTime() - generatedAt.getTime())) / 1_000),
  );
}

export async function getTasteProfile(
  userId: string,
): Promise<TasteProfileDTO | null> {
  const [profile] = await db
    .select()
    .from(tasteProfiles)
    .where(eq(tasteProfiles.userId, userId))
    .limit(1);
  return profile ? mapProfile(profile) : null;
}

async function loadTopGenres(userId: string): Promise<TasteGenreDTO[]> {
  const result = await db.execute<{ name: string; count: number }>(sql`
    select genre as name, count(*)::int as count
    from ${savedTracks}
    inner join ${tracks} on ${tracks.id} = ${savedTracks.trackId}
    inner join ${artists} on ${artists.id} = ${tracks.artistId}
    cross join lateral unnest(${artists.genres}) as genre
    where ${savedTracks.userId} = ${userId}
    group by genre
    order by count(*) desc, genre asc
    limit ${AGGREGATE_LIMIT}
  `);
  return result.rows.map((row) => ({ name: row.name, count: Number(row.count) }));
}

async function loadTopArtists(userId: string): Promise<TasteArtistDTO[]> {
  const rows = await db
    .select({
      id: artists.id,
      name: artists.name,
      imageUrl: artists.imageUrl,
      count: count(savedTracks.id),
    })
    .from(savedTracks)
    .innerJoin(tracks, eq(savedTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .where(eq(savedTracks.userId, userId))
    .groupBy(artists.id, artists.name, artists.imageUrl)
    .orderBy(desc(count(savedTracks.id)), artists.name)
    .limit(AGGREGATE_LIMIT);
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

async function loadMoodDistribution(userId: string): Promise<TasteMoodDTO[]> {
  const rows = await db
    .select({ mood: memories.mood, count: count(memories.id) })
    .from(memories)
    .where(and(eq(memories.userId, userId), isNotNull(memories.mood)))
    .groupBy(memories.mood)
    .orderBy(desc(count(memories.id)), memories.mood);
  return rows.map((row) => ({ mood: row.mood as Mood, count: Number(row.count) }));
}

async function loadRecentMemorySnippets(userId: string): Promise<string[]> {
  const rows = await db
    .select({ content: memories.content })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(MEMORY_LIMIT);
  return rows.map((row) => row.content.slice(0, MEMORY_SNIPPET_LENGTH));
}

export async function refreshTasteProfile(
  userId: string,
): Promise<TasteProfileDTO> {
  const [savedCountRow] = await db
    .select({ count: count(savedTracks.id) })
    .from(savedTracks)
    .where(eq(savedTracks.userId, userId));
  if (Number(savedCountRow?.count ?? 0) < MINIMUM_SAVED_TRACKS) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Need at least 5 saved tracks",
    );
  }

  const [stored] = await db
    .select({ generatedAt: tasteProfiles.generatedAt })
    .from(tasteProfiles)
    .where(eq(tasteProfiles.userId, userId))
    .limit(1);
  if (stored) {
    const retryAfterSeconds = tasteRefreshRetryAfterSeconds(stored.generatedAt);
    if (retryAfterSeconds > 0) {
      throw new ApiError(
        "RATE_LIMITED",
        "Taste DNA was refreshed recently",
        { retryAfterSeconds },
      );
    }
  }

  const [topGenres, topArtists, moodDistribution, memorySnippets] =
    await Promise.all([
      loadTopGenres(userId),
      loadTopArtists(userId),
      loadMoodDistribution(userId),
      loadRecentMemorySnippets(userId),
    ]);
  const written = await generateTasteSummary({
    topGenres,
    topArtists,
    moodDistribution,
    memories: memorySnippets,
  });
  const generatedAt = new Date();

  const [profile] = await db
    .insert(tasteProfiles)
    .values({
      userId,
      ...written,
      topGenres,
      topArtists,
      moodDistribution,
      generatedAt,
    })
    .onConflictDoUpdate({
      target: tasteProfiles.userId,
      set: {
        ...written,
        topGenres,
        topArtists,
        moodDistribution,
        generatedAt,
      },
    })
    .returning();

  return mapProfile(profile);
}
