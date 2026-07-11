import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";

const fixture = vi.hoisted(() => ({
  concept: {
    title: "Test Transmission",
    vibeDescription:
      "A focused test sequence built for a quiet night. The signal rises and resolves without breaking concentration.",
    candidates: Array.from({ length: 12 }, (_, index) => ({
      artist: `Playlist Test Artist ${index}`,
      title: `Playlist Test Track ${index}`,
      reason: `Reason ${index}`,
    })),
  },
}));

vi.mock("@/server/ai/playlist", () => ({
  generatePlaylistConcept: vi.fn(async () => fixture.concept),
}));
vi.mock("@/server/ai/embeddings", () => ({
  embedQuery: vi.fn(async () => {
    throw new Error("embeddings unavailable in test");
  }),
}));
vi.mock("@/server/music/deezer", () => ({
  musicProvider: {
    searchTracks: vi.fn(async (query: string) => {
      const index = fixture.concept.candidates.findIndex(
        (candidate) => `${candidate.artist} ${candidate.title}` === query,
      );
      if (index < 0) return [];
      return [
        {
          provider: "deezer" as const,
          providerId: `playlist-test-track-${index}`,
          title: fixture.concept.candidates[index].title,
          durationMs: 180_000,
          previewUrl: null,
          albumName: "Test Signals",
          albumImageUrl: null,
          artist: {
            provider: "deezer" as const,
            providerId: `playlist-test-artist-${index}`,
            name: fixture.concept.candidates[index].artist,
            imageUrl: null,
            genres: ["test"],
          },
        },
      ];
    }),
  },
}));

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let svc: typeof import("./playlists") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    svc = await import("./playlists");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("playlists service (db integration)", () => {
  if (!dbReady) return;
  const db = dbmod!.db;
  const { user, playlists, tracks, artists } = schema!;
  const { generatePlaylist, getPlaylist, listPlaylists, deletePlaylist } = svc!;
  const tag = randomUUID().slice(0, 8);
  const userA = `playlist_${tag}_a`;
  const userB = `playlist_${tag}_b`;
  let playlistId = "";

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "A", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "B", email: `${userB}@test.local`, emailVerified: false },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB]));
    await db.delete(tracks).where(like(tracks.providerId, "playlist-test-track-%"));
    await db.delete(artists).where(like(artists.providerId, "playlist-test-artist-%"));
    await dbmod!.pool.end();
  });

  it("persists an ordered playlist without saving its tracks", async () => {
    const result = await generatePlaylist(userA, "quiet test night");
    playlistId = result.id;
    expect(result.tracks).toHaveLength(12);
    expect(result.tracks.map((item) => item.position)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(result.tracks.every((item) => item.track.saved === false)).toBe(true);
    expect(result.sparse).toBe(false);

    const list = await listPlaylists(userA);
    expect(list.find((item) => item.id === playlistId)?.trackCount).toBe(12);
  });

  it("enforces ownership and cascades deletion", async () => {
    await expect(getPlaylist(userB, playlistId)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(await deletePlaylist(userB, playlistId)).toBe(false);
    expect(await deletePlaylist(userA, playlistId)).toBe(true);
    await expect(getPlaylist(userA, playlistId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(
      await db.select().from(playlists).where(eq(playlists.id, playlistId)),
    ).toHaveLength(0);
  });
});
