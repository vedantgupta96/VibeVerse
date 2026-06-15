import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { ProviderTrack } from "@/server/music/provider";

/**
 * DB integration test. Skips cleanly when DATABASE_URL is absent or the
 * database is unreachable, so `npm run test` still passes without Docker.
 */
const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let svc: typeof import("./library") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    svc = await import("./library");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("library save (db integration)", () => {
  const db = dbmod!.db;
  const { user, savedTracks, tracks, artists } = schema!;
  const { persistSavedTrack, unsaveTrack, listLibrary } = svc!;

  const tag = randomUUID().slice(0, 8);
  const userA = `test_${tag}_a`;
  const userB = `test_${tag}_b`;
  const providerId = `test-${tag}`;
  const artistProviderId = `test-artist-${tag}`;

  const sample: ProviderTrack = {
    provider: "deezer",
    providerId,
    title: "Test Track",
    durationMs: 200000,
    previewUrl: null,
    albumName: "Test Album",
    albumImageUrl: null,
    artist: {
      provider: "deezer",
      providerId: artistProviderId,
      name: "Test Artist",
      imageUrl: null,
      genres: ["test-genre"],
    },
  };

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "A", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "B", email: `${userB}@test.local`, emailVerified: false },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB])); // cascades saves
    await db.delete(tracks).where(eq(tracks.providerId, providerId));
    await db.delete(artists).where(eq(artists.providerId, artistProviderId));
    await dbmod!.pool.end();
  });

  it("shares one track/artist row across users and is idempotent per user", async () => {
    const first = await persistSavedTrack(userA, sample);
    expect(first.created).toBe(true);

    const again = await persistSavedTrack(userA, sample);
    expect(again.created).toBe(false); // idempotent
    expect(again.track.id).toBe(first.track.id);

    const second = await persistSavedTrack(userB, sample);
    expect(second.created).toBe(true);
    expect(second.track.id).toBe(first.track.id); // same shared track row

    const trackRows = await db
      .select()
      .from(tracks)
      .where(eq(tracks.providerId, providerId));
    expect(trackRows).toHaveLength(1);

    const artistRows = await db
      .select()
      .from(artists)
      .where(eq(artists.providerId, artistProviderId));
    expect(artistRows).toHaveLength(1);

    const savedRows = await db
      .select()
      .from(savedTracks)
      .where(eq(savedTracks.trackId, first.track.id!));
    expect(savedRows).toHaveLength(2); // one per user
  });

  it("isolates one user's library from another's", async () => {
    const { track } = await persistSavedTrack(userA, sample);
    await persistSavedTrack(userB, sample);

    const removed = await unsaveTrack(userA, track.id!);
    expect(removed).toBe(true);

    const libA = await listLibrary(userA);
    expect(libA.tracks.some((t) => t.providerId === providerId)).toBe(false);

    const libB = await listLibrary(userB);
    expect(libB.tracks.some((t) => t.providerId === providerId)).toBe(true);

    // unsaving again is a no-op (already removed)
    expect(await unsaveTrack(userA, track.id!)).toBe(false);
  });
});
