import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

// Force the embedding path to fail so we exercise the "save without vector"
// branch deterministically (and avoid any network call in tests).
vi.mock("@/server/ai/embeddings", () => {
  class EmbeddingUnavailableError extends Error {}
  return {
    EmbeddingUnavailableError,
    embedDocument: vi.fn(async () => {
      throw new EmbeddingUnavailableError("no key in tests");
    }),
    embedQuery: vi.fn(async () => {
      throw new EmbeddingUnavailableError("no key in tests");
    }),
  };
});

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let svc: typeof import("./memories") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    svc = await import("./memories");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("memories service (db integration)", () => {
  const db = dbmod!.db;
  const { user, artists, tracks, memories } = schema!;
  const { createMemory, listMemories, updateMemory, deleteMemory } = svc!;

  const tag = randomUUID().slice(0, 8);
  const userA = `mem_${tag}_a`;
  const userB = `mem_${tag}_b`;
  const providerId = `memtest-${tag}`;
  const artistProviderId = `memtest-artist-${tag}`;
  let trackId = "";

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "A", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "B", email: `${userB}@test.local`, emailVerified: false },
    ]);
    const [artist] = await db
      .insert(artists)
      .values({ provider: "deezer", providerId: artistProviderId, name: "Mem Artist" })
      .returning({ id: artists.id });
    const [track] = await db
      .insert(tracks)
      .values({
        provider: "deezer",
        providerId,
        title: "Mem Track",
        artistId: artist.id,
      })
      .returning({ id: tracks.id });
    trackId = track.id;
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB])); // cascades memories
    await db.delete(tracks).where(eq(tracks.providerId, providerId));
    await db.delete(artists).where(eq(artists.providerId, artistProviderId));
    await dbmod!.pool.end();
  });

  it("saves a memory with a null embedding when embedding fails", async () => {
    const memory = await createMemory(userA, {
      trackId,
      content: "This reminds me of late nights coding",
      mood: "nostalgic",
    });
    expect(memory.id).toBeTruthy();
    expect(memory.mood).toBe("nostalgic");

    const [row] = await db
      .select({ embedding: memories.embedding })
      .from(memories)
      .where(eq(memories.id, memory.id));
    expect(row.embedding).toBeNull(); // saved despite embedding failure
  });

  it("enforces per-user ownership", async () => {
    const memory = await createMemory(userA, {
      trackId,
      content: "A private memory",
      mood: null,
    });

    // B cannot update A's memory
    await expect(
      updateMemory(userB, memory.id, { content: "hacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // B cannot delete A's memory
    expect(await deleteMemory(userB, memory.id)).toBe(false);

    // B's feed never sees A's memory; A's does
    const listB = await listMemories(userB);
    expect(listB.memories.some((m) => m.id === memory.id)).toBe(false);
    const listA = await listMemories(userA);
    expect(listA.memories.some((m) => m.id === memory.id)).toBe(true);

    // A can delete their own
    expect(await deleteMemory(userA, memory.id)).toBe(true);
  });
});
