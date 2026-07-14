import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import type { ProviderTrack } from "@/server/music/provider";

const tag = randomUUID().slice(0, 8);
const providerIdA = `roomq-test-${tag}-a`;
const providerIdB = `roomq-test-${tag}-b`;
const providerIdC = `roomq-test-${tag}-c`;
const artistProviderId = `roomq-test-artist-${tag}`;

function track(providerId: string, title: string): ProviderTrack {
  return {
    provider: "deezer",
    providerId,
    title,
    durationMs: 200_000,
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
}

const tracksByProviderId: Record<string, ProviderTrack> = {
  [providerIdA]: track(providerIdA, "Test Track A"),
  [providerIdB]: track(providerIdB, "Test Track B"),
  [providerIdC]: track(providerIdC, "Test Track C"),
};

vi.mock("@/server/music/deezer", () => ({
  musicProvider: {
    getTrack: vi.fn(async (providerId: string) => tracksByProviderId[providerId] ?? null),
  },
}));

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let roomsSvc: typeof import("./rooms") | undefined;
let queueSvc: typeof import("./room-queue") | undefined;
let librarySvc: typeof import("./library") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    roomsSvc = await import("./rooms");
    queueSvc = await import("./room-queue");
    librarySvc = await import("./library");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("room queue service (db integration)", () => {
  if (!dbReady) return;
  const db = dbmod!.db;
  const { user, tracks, artists } = schema!;
  const { createRoom, joinRoomByCode } = roomsSvc!;
  const { persistSavedTrack } = librarySvc!;
  const {
    addToQueue,
    removeQueueItem,
    castVote,
    clearVote,
    advanceNowPlaying,
  } = queueSvc!;

  const userA = `roomq_${tag}_a`; // room owner
  const userB = `roomq_${tag}_b`; // member/adder
  const userC = `roomq_${tag}_c`; // non-member

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "Owner", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "Member", email: `${userB}@test.local`, emailVerified: false },
      { id: userC, name: "Outsider", email: `${userC}@test.local`, emailVerified: false },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB, userC]));
    await db.delete(tracks).where(like(tracks.providerId, `roomq-test-${tag}-%`));
    await db.delete(artists).where(eq(artists.providerId, artistProviderId));
    await dbmod!.pool.end();
  });

  it("reuses an existing track/artist row instead of duplicating it (upsert reuse)", async () => {
    // Pre-save the track to userA's library so tracks/artists rows already exist.
    const { track: saved } = await persistSavedTrack(userA, tracksByProviderId[providerIdA]);

    const room = await createRoom(userA, "Queue Test Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const item = await addToQueue(userB, room.id, providerIdA);
    expect(item.track.id).toBe(saved.id); // same underlying track row
    expect(item.status).toBe("queued");
    expect(item.addedByUserId).toBe(userB);
    expect(item.voteScore).toBe(0);
    expect(item.myVote).toBeNull();

    const trackRows = await db.select().from(tracks).where(eq(tracks.providerId, providerIdA));
    expect(trackRows).toHaveLength(1); // no duplicate created by the queue insert
  });

  it("rejects a duplicate active instance of the same track (VALIDATION_ERROR)", async () => {
    const room = await createRoom(userA, "Duplicate Track Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    await addToQueue(userB, room.id, providerIdB);
    await expect(addToQueue(userB, room.id, providerIdB)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("requires membership to add to the queue", async () => {
    const room = await createRoom(userA, "Membership Gate Room");
    await expect(addToQueue(userC, room.id, providerIdA)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("vote casting is idempotent per user and recomputes voteScore/myVote", async () => {
    const room = await createRoom(userA, "Vote Test Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const item = await addToQueue(userB, room.id, providerIdA);

    const afterFirstVote = await castVote(userA, room.id, item.id, 1);
    expect(afterFirstVote.voteScore).toBe(1);
    expect(afterFirstVote.myVote).toBe(1);

    // Re-casting the same value doesn't duplicate the row.
    const afterRepeat = await castVote(userA, room.id, item.id, 1);
    expect(afterRepeat.voteScore).toBe(1);

    const afterSecondUser = await castVote(userB, room.id, item.id, -1);
    expect(afterSecondUser.voteScore).toBe(0); // +1 and -1
    expect(afterSecondUser.myVote).toBe(-1); // from userB's perspective

    // Changing an existing vote updates rather than adds a row.
    const afterChange = await castVote(userA, room.id, item.id, -1);
    expect(afterChange.voteScore).toBe(-2);

    await clearVote(userA, room.id, item.id);
    const afterClear = await castVote(userB, room.id, item.id, -1);
    expect(afterClear.voteScore).toBe(-1);
  });

  it("advance is owner-only and transitions status queued -> playing -> played", async () => {
    const room = await createRoom(userA, "Advance Test Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);

    await expect(advanceNowPlaying(userB, room.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const nowPlaying1 = await advanceNowPlaying(userA, room.id);
    expect(nowPlaying1?.id).toBe(first.id);
    expect(nowPlaying1?.status).toBe("playing");

    const second = await addToQueue(userB, room.id, providerIdB);
    const nowPlaying2 = await advanceNowPlaying(userA, room.id);
    expect(nowPlaying2?.id).toBe(second.id);
    expect(nowPlaying2?.status).toBe("playing");

    // The first item is now history (played), not surfaced again.
    const rows = await db
      .select()
      .from(schema!.roomQueueItems)
      .where(eq(schema!.roomQueueItems.id, first.id));
    expect(rows[0]?.status).toBe("played");

    // No queued items remain — advancing again ends the session (null).
    const drained = await advanceNowPlaying(userA, room.id);
    expect(drained).toBeNull();
  });

  it("promotes the first queued item when the expected now-playing item is null", async () => {
    const room = await createRoom(userA, "Expected Empty Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    const nowPlaying = await advanceNowPlaying(userA, room.id, null);

    expect(nowPlaying).toMatchObject({ id: first.id, status: "playing" });
  });

  it("treats a repeated null expectation as stale after promotion", async () => {
    const room = await createRoom(userA, "Repeated Empty Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    await expect(advanceNowPlaying(userA, room.id, null)).resolves.toMatchObject({
      id: first.id,
      status: "playing",
    });

    await expect(advanceNowPlaying(userA, room.id, null)).resolves.toMatchObject({
      id: first.id,
      status: "playing",
    });

    const [row] = await db
      .select({ status: schema!.roomQueueItems.status })
      .from(schema!.roomQueueItems)
      .where(eq(schema!.roomQueueItems.id, first.id));
    expect(row.status).toBe("playing");
  });

  it("advances an expected current item exactly once", async () => {
    const room = await createRoom(userA, "Expected Current Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    const second = await addToQueue(userB, room.id, providerIdB);
    const current = await advanceNowPlaying(userA, room.id, null);
    expect(current?.id).toBe(first.id);

    await expect(
      advanceNowPlaying(userA, room.id, first.id),
    ).resolves.toMatchObject({ id: second.id, status: "playing" });
    await expect(
      advanceNowPlaying(userA, room.id, first.id),
    ).resolves.toMatchObject({ id: second.id, status: "playing" });

    const rows = await db
      .select({ id: schema!.roomQueueItems.id, status: schema!.roomQueueItems.status })
      .from(schema!.roomQueueItems)
      .where(eq(schema!.roomQueueItems.roomId, room.id));
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: first.id, status: "played" },
        { id: second.id, status: "playing" },
      ]),
    );
  });

  it("concurrent advances with the same expectation converge on one playing item", async () => {
    const room = await createRoom(userA, "Guarded Concurrent Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    const second = await addToQueue(userB, room.id, providerIdB);
    const results = await Promise.all([
      advanceNowPlaying(userA, room.id, null),
      advanceNowPlaying(userA, room.id, null),
    ]);

    expect(results.map((item) => item?.id)).toEqual([first.id, first.id]);

    const rows = await db
      .select({ id: schema!.roomQueueItems.id, status: schema!.roomQueueItems.status })
      .from(schema!.roomQueueItems)
      .where(eq(schema!.roomQueueItems.roomId, room.id));
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: first.id, status: "playing" },
        { id: second.id, status: "queued" },
      ]),
    );
  });

  it("serializes concurrent advances that expect the same playing item", async () => {
    const room = await createRoom(userA, "Locked Concurrent Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    const second = await addToQueue(userB, room.id, providerIdB);
    const third = await addToQueue(userB, room.id, providerIdC);
    await expect(advanceNowPlaying(userA, room.id, null)).resolves.toMatchObject({
      id: first.id,
      status: "playing",
    });

    const results = await Promise.all([
      advanceNowPlaying(userA, room.id, first.id),
      advanceNowPlaying(userA, room.id, first.id),
    ]);
    expect(results.map((item) => item?.id)).toEqual([second.id, second.id]);

    const rows = await db
      .select({ id: schema!.roomQueueItems.id, status: schema!.roomQueueItems.status })
      .from(schema!.roomQueueItems)
      .where(eq(schema!.roomQueueItems.roomId, room.id));
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: first.id, status: "played" },
        { id: second.id, status: "playing" },
        { id: third.id, status: "queued" },
      ]),
    );
  });

  it("recovers when a concurrent advance wins the one-playing constraint", async () => {
    const room = await createRoom(userA, "Concurrent Advance Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);

    const first = await addToQueue(userB, room.id, providerIdA);
    const winner = await addToQueue(userB, room.id, providerIdB);

    // Hold an uncommitted promotion of the second item. advanceNowPlaying's
    // transaction still sees both items as queued, selects the older `first`,
    // then waits on the partial unique index when it tries to promote it.
    // Committing here makes the held promotion win and forces the exact
    // room_queue_items_one_playing_key recovery path.
    const client = await dbmod!.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        'update "room_queue_items" set "status" = \'playing\' where "id" = $1',
        [winner.id],
      );

      const advance = advanceNowPlaying(userA, room.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await client.query("commit");

      await expect(advance).resolves.toMatchObject({
        id: winner.id,
        status: "playing",
      });

      const [firstRow] = await db
        .select({ status: schema!.roomQueueItems.status })
        .from(schema!.roomQueueItems)
        .where(eq(schema!.roomQueueItems.id, first.id));
      expect(firstRow.status).toBe("queued");
    } finally {
      // Safe after COMMIT and also cleans up if an assertion/setup step throws.
      await client.query("rollback").catch(() => {});
      client.release();
    }
  });

  it("only the adder or the room owner may remove a queue item", async () => {
    const room = await createRoom(userA, "Remove Test Room");
    await joinRoomByCode({ id: userB, name: "Member" }, room.code);
    await joinRoomByCode({ id: userC, name: "Outsider" }, room.code);

    const item = await addToQueue(userB, room.id, providerIdA);

    await expect(removeQueueItem(userC, room.id, item.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await removeQueueItem(userA, room.id, item.id); // owner may remove anyone's item

    await expect(removeQueueItem(userA, room.id, item.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
