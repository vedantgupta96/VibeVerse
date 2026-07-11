import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let service: typeof import("./galaxy") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    service = await import("./galaxy");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("galaxy service (db integration)", () => {
  if (!dbReady) return;
  const db = dbmod!.db;
  const { user, artists, tracks, savedTracks } = schema!;
  const tag = randomUUID().slice(0, 8);
  const users = [`galaxy-${tag}-a`, `galaxy-${tag}-b`];
  const artistIds: string[] = [];
  const trackIds: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values(users.map((id) => ({
      id,
      name: id,
      email: `${id}@test.local`,
      emailVerified: false,
    })));
    const createdArtists = await db.insert(artists).values([
      { provider: "deezer", providerId: `${tag}-a`, name: "Visible", genres: ["ambient"] },
      { provider: "deezer", providerId: `${tag}-b`, name: "Private", genres: ["rock"] },
    ]).returning({ id: artists.id });
    artistIds.push(...createdArtists.map(({ id }) => id));
    const createdTracks = await db.insert(tracks).values([
      { provider: "deezer", providerId: `${tag}-track-a`, title: "Visible track", artistId: createdArtists[0].id },
      { provider: "deezer", providerId: `${tag}-track-b`, title: "Private track", artistId: createdArtists[1].id },
    ]).returning({ id: tracks.id });
    trackIds.push(...createdTracks.map(({ id }) => id));
    await db.insert(savedTracks).values([
      { userId: users[0], trackId: createdTracks[0].id },
      { userId: users[1], trackId: createdTracks[1].id },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, users));
    await db.delete(tracks).where(inArray(tracks.id, trackIds));
    await db.delete(artists).where(inArray(artists.id, artistIds));
    await dbmod!.pool.end();
  });

  it("returns only the requesting user's saved tracks and artists", async () => {
    const graph = await service!.getGalaxy(users[0]);
    expect(graph.tracks.map((track) => track.title)).toEqual(["Visible track"]);
    expect(graph.nodes.some((node) => node.kind === "artist" && node.label === "Private")).toBe(false);
  });
});
