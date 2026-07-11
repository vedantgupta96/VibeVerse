import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const ai = vi.hoisted(() => ({
  generateTasteSummary: vi.fn(async () => ({
    summary:
      "A thoughtful test portrait that follows the evidence in this small library while leaving enough room for the listener to keep changing.",
    listenerArchetype: "Test Cartographer",
    traits: ["Curious listener", "Memory keeper", "Genre wanderer"],
  })),
}));

vi.mock("@/server/ai/taste", () => ai);

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let svc: typeof import("./taste") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    svc = await import("./taste");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("taste profile service (db integration)", () => {
  if (!dbReady) return;
  const db = dbmod!.db;
  const { user, artists, tracks, savedTracks, memories, tasteProfiles } = schema!;
  const { getTasteProfile, refreshTasteProfile } = svc!;
  const tag = randomUUID().slice(0, 8);
  const userA = `taste_${tag}_a`;
  const userB = `taste_${tag}_b`;
  const createdTrackIds: string[] = [];
  const createdArtistIds: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "A", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "B", email: `${userB}@test.local`, emailVerified: false },
    ]);

    const artistRows = await db
      .insert(artists)
      .values([
        { provider: "deezer", providerId: `taste-${tag}-artist-a`, name: "Artist A", genres: ["ambient", "electronic"] },
        { provider: "deezer", providerId: `taste-${tag}-artist-b`, name: "Artist B", genres: ["electronic"] },
        { provider: "deezer", providerId: `taste-${tag}-artist-c`, name: "Artist C", genres: [] },
      ])
      .returning({ id: artists.id });
    createdArtistIds.push(...artistRows.map((row) => row.id));

    const trackRows = await db
      .insert(tracks)
      .values(Array.from({ length: 6 }, (_, index) => ({
        provider: "deezer",
        providerId: `taste-${tag}-track-${index}`,
        title: `Taste Track ${index}`,
        artistId: artistRows[index < 3 ? 0 : index < 5 ? 1 : 2].id,
        durationMs: 180_000,
      })))
      .returning({ id: tracks.id });
    createdTrackIds.push(...trackRows.map((row) => row.id));
    await db.insert(savedTracks).values([
      ...trackRows.map((track) => ({ userId: userA, trackId: track.id })),
      ...trackRows.slice(0, 4).map((track) => ({ userId: userB, trackId: track.id })),
    ]);
    await db.insert(memories).values([
      { userId: userA, trackId: trackRows[0].id, content: "First memory", mood: "nostalgic" },
      { userId: userA, trackId: trackRows[1].id, content: "Second memory", mood: "nostalgic" },
      { userId: userA, trackId: trackRows[2].id, content: "Third memory", mood: "calm" },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB]));
    await db.delete(tracks).where(inArray(tracks.id, createdTrackIds));
    await db.delete(artists).where(inArray(artists.id, createdArtistIds));
    await dbmod!.pool.end();
  });

  it("enforces threshold, stores SQL aggregates, isolates users, and upserts", async () => {
    await expect(refreshTasteProfile(userB)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Need at least 5 saved tracks",
    });

    const first = await refreshTasteProfile(userA);
    expect(first.topGenres).toEqual([
      { name: "electronic", count: 5 },
      { name: "ambient", count: 3 },
    ]);
    expect(first.topArtists.map(({ name, count }) => ({ name, count }))).toEqual([
      { name: "Artist A", count: 3 },
      { name: "Artist B", count: 2 },
      { name: "Artist C", count: 1 },
    ]);
    expect(first.moodDistribution).toEqual([
      { mood: "nostalgic", count: 2 },
      { mood: "calm", count: 1 },
    ]);
    expect(ai.generateTasteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        topGenres: first.topGenres,
        topArtists: first.topArtists,
        moodDistribution: first.moodDistribution,
        memories: expect.arrayContaining(["First memory", "Second memory", "Third memory"]),
      }),
    );
    expect(await getTasteProfile(userB)).toBeNull();
    expect((await getTasteProfile(userA))?.listenerArchetype).toBe("Test Cartographer");

    await expect(refreshTasteProfile(userA)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(ai.generateTasteSummary).toHaveBeenCalledTimes(1);

    await db
      .update(tasteProfiles)
      .set({ generatedAt: new Date(Date.now() - 121_000) })
      .where(eq(tasteProfiles.userId, userA));
    const second = await refreshTasteProfile(userA);
    expect(second.generatedAt).not.toBe(first.generatedAt);
    expect(
      await db.select().from(tasteProfiles).where(eq(tasteProfiles.userId, userA)),
    ).toHaveLength(1);
  });
});
