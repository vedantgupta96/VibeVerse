import "server-only";
import {
  and,
  cosineDistance,
  desc,
  eq,
  isNotNull,
  lt,
  sql,
} from "drizzle-orm";
import { db } from "@/server/db";
import { artists, memories, savedTracks, tracks } from "@/server/db/schema";
import {
  EmbeddingUnavailableError,
  embedDocument,
  embedQuery,
} from "@/server/ai/embeddings";
import { ApiError } from "@/lib/errors";
import type { Mood } from "@/lib/moods";
import type { MemoryDTO, MemorySearchResultDTO } from "@/lib/dto";
import { logger } from "@/server/logger";

const FEED_PAGE_SIZE = 30;
const SEARCH_LIMIT = 10;

const memoryColumns = {
  id: memories.id,
  content: memories.content,
  mood: memories.mood,
  createdAt: memories.createdAt,
  updatedAt: memories.updatedAt,
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

type MemoryRow = {
  id: string;
  content: string;
  mood: Mood | null;
  createdAt: Date;
  updatedAt: Date;
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
};

function mapMemory(row: MemoryRow): MemoryDTO {
  return {
    id: row.id,
    content: row.content,
    mood: row.mood,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    track: {
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
    },
  };
}

// Embeddings never block a write: on failure the memory is saved with a null
// vector (it just won't appear in semantic search). See PRODUCT_SPEC F4.
async function safeEmbed(content: string): Promise<number[] | null> {
  try {
    return await embedDocument(content);
  } catch (error) {
    logger.warn("memory.embedding_degraded", { error });
    return null;
  }
}

function baseQuery(userId: string) {
  return db
    .select(memoryColumns)
    .from(memories)
    .innerJoin(tracks, eq(memories.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(
      savedTracks,
      and(eq(savedTracks.trackId, tracks.id), eq(savedTracks.userId, userId)),
    );
}

async function loadMemory(userId: string, id: string): Promise<MemoryDTO> {
  const [row] = await baseQuery(userId).where(eq(memories.id, id)).limit(1);
  return mapMemory(row);
}

export async function createMemory(
  userId: string,
  input: { trackId: string; content: string; mood: Mood | null },
): Promise<MemoryDTO> {
  const [track] = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.id, input.trackId))
    .limit(1);
  if (!track) throw new ApiError("NOT_FOUND", "Track not found");

  const embedding = await safeEmbed(input.content);

  const [created] = await db
    .insert(memories)
    .values({
      userId,
      trackId: input.trackId,
      content: input.content,
      mood: input.mood,
      embedding,
    })
    .returning({ id: memories.id });

  return loadMemory(userId, created.id);
}

export async function listMemories(
  userId: string,
  opts: { trackId?: string; cursor?: string; limit?: number } = {},
): Promise<{ memories: MemoryDTO[]; nextCursor: string | null }> {
  const limit = opts.limit ?? FEED_PAGE_SIZE;
  const rows = await baseQuery(userId)
    .where(
      and(
        eq(memories.userId, userId),
        opts.trackId ? eq(memories.trackId, opts.trackId) : undefined,
        opts.cursor ? lt(memories.createdAt, new Date(opts.cursor)) : undefined,
      ),
    )
    .orderBy(desc(memories.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? page[page.length - 1].createdAt.toISOString()
    : null;

  return { memories: page.map(mapMemory), nextCursor };
}

export async function updateMemory(
  userId: string,
  id: string,
  input: { content?: string; mood?: Mood | null },
): Promise<MemoryDTO> {
  const [existing] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);
  if (!existing) throw new ApiError("NOT_FOUND", "Memory not found");

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.content !== undefined) {
    set.content = input.content;
    set.embedding = await safeEmbed(input.content); // re-embed on content change
  }
  if (input.mood !== undefined) {
    set.mood = input.mood;
  }

  await db
    .update(memories)
    .set(set)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));

  return loadMemory(userId, id);
}

export async function deleteMemory(
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .returning({ id: memories.id });
  return deleted.length > 0;
}

export async function searchMemories(
  userId: string,
  query: string,
): Promise<MemorySearchResultDTO[]> {
  let vector: number[];
  try {
    vector = await embedQuery(query);
  } catch (error) {
    if (error instanceof EmbeddingUnavailableError) {
      throw new ApiError(
        "AI_UNAVAILABLE",
        "Semantic search is unavailable right now",
      );
    }
    throw error;
  }

  const distance = cosineDistance(memories.embedding, vector);
  const rows = await db
    .select({
      ...memoryColumns,
      similarity: sql<number>`1 - (${distance})`,
    })
    .from(memories)
    .innerJoin(tracks, eq(memories.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(
      savedTracks,
      and(eq(savedTracks.trackId, tracks.id), eq(savedTracks.userId, userId)),
    )
    .where(and(eq(memories.userId, userId), isNotNull(memories.embedding)))
    .orderBy(distance)
    .limit(SEARCH_LIMIT);

  return rows.map((row) => ({
    ...mapMemory(row),
    similarity: Number(row.similarity),
  }));
}
