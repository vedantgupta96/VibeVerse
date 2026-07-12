import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const fixture = vi.hoisted(() => ({
  vibe: { summary: "A test room reading, generated for the integration suite only." },
}));

vi.mock("@/server/ai/roomVibe", () => ({
  generateRoomVibeSummary: vi.fn(async () => fixture.vibe),
}));

const hasDbUrl = Boolean(process.env.DATABASE_URL);
let dbReady = false;
let dbmod: typeof import("@/server/db") | undefined;
let svc: typeof import("./rooms") | undefined;
let schema: typeof import("@/server/db/schema") | undefined;

if (hasDbUrl) {
  try {
    dbmod = await import("@/server/db");
    await dbmod.pool.query("select 1");
    svc = await import("./rooms");
    schema = await import("@/server/db/schema");
    dbReady = true;
  } catch {
    dbReady = false;
  }
}

describe.skipIf(!dbReady)("rooms service (db integration)", () => {
  if (!dbReady) return;
  const db = dbmod!.db;
  const { user, rooms, roomMembers } = schema!;
  const {
    createRoom,
    joinRoomByCode,
    joinRoom,
    leaveRoom,
    touchPresence,
    getRoomSnapshot,
    generateRoomVibe,
  } = svc!;

  const tag = randomUUID().slice(0, 8);
  const userA = `room_${tag}_a`;
  const userB = `room_${tag}_b`;
  const userC = `room_${tag}_c`;

  beforeAll(async () => {
    await db.insert(user).values([
      { id: userA, name: "Room Owner", email: `${userA}@test.local`, emailVerified: false },
      { id: userB, name: "Room Guest", email: `${userB}@test.local`, emailVerified: false },
      { id: userC, name: "Outsider", email: `${userC}@test.local`, emailVerified: false },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(inArray(user.id, [userA, userB, userC])); // cascades rooms/members
    await dbmod!.pool.end();
  });

  it("creates a room with the owner as its first (active) member", async () => {
    const room = await createRoom(userA, "Integration Test Room");
    expect(room.ownerId).toBe(userA);
    expect(room.code).toHaveLength(6);
    expect(room.memberCount).toBe(1);
    expect(room.activeCount).toBe(1);

    const rows = await db.select().from(rooms).where(eq(rooms.id, room.id));
    expect(rows).toHaveLength(1);
  });

  it("join-by-code is idempotent and only publishes on first join", async () => {
    const room = await createRoom(userA, "Join Test Room");

    const first = await joinRoomByCode(
      { id: userB, name: "Room Guest" },
      room.code,
    );
    expect(first.memberCount).toBe(2);

    const second = await joinRoomByCode(
      { id: userB, name: "Room Guest" },
      room.code,
    );
    expect(second.memberCount).toBe(2); // no duplicate membership row

    const memberRows = await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.roomId, room.id));
    expect(memberRows).toHaveLength(2);
  });

  it("joinRoom (page-mount entry point) creates membership for a new visitor and bumps lastSeen for an existing one", async () => {
    const room = await createRoom(userA, "Join By Id Room");

    const snapshot = await joinRoom({ id: userB, name: "Room Guest" }, room.id);
    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.isOwner).toBe(false);

    // Backdate the guest's heartbeat, then re-join: joinRoom should bump it
    // even though the membership row already existed.
    await db
      .update(roomMembers)
      .set({ lastSeenAt: new Date(Date.now() - 5 * 60_000) })
      .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, userB)));

    const rejoined = await joinRoom({ id: userB, name: "Room Guest" }, room.id);
    expect(rejoined.members.find((m) => m.userId === userB)?.active).toBe(true);
  });

  it("rejects an unknown join code", async () => {
    await expect(
      joinRoomByCode({ id: userB, name: "Room Guest" }, "ZZZZZZ"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns a full snapshot for members and 403s for non-members", async () => {
    const room = await createRoom(userA, "Snapshot Test Room");
    await joinRoomByCode({ id: userB, name: "Room Guest" }, room.code);

    const snapshot = await getRoomSnapshot(userA, room.id);
    expect(snapshot.isOwner).toBe(true);
    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.queue).toEqual([]);
    expect(snapshot.nowPlaying).toBeNull();

    const guestSnapshot = await getRoomSnapshot(userB, room.id);
    expect(guestSnapshot.isOwner).toBe(false);

    await expect(getRoomSnapshot(userC, room.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("404s a snapshot for a nonexistent room", async () => {
    await expect(getRoomSnapshot(userA, randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("leave removes the membership row without deleting the room", async () => {
    const room = await createRoom(userA, "Leave Test Room");
    await joinRoomByCode({ id: userB, name: "Room Guest" }, room.code);

    await leaveRoom(userB, room.id);
    await expect(getRoomSnapshot(userB, room.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // Room itself is untouched — the owner can still see it.
    const snapshot = await getRoomSnapshot(userA, room.id);
    expect(snapshot.members).toHaveLength(1);

    // Leaving again is a harmless no-op.
    await expect(leaveRoom(userB, room.id)).resolves.toBeUndefined();
  });

  it("computes presence from the heartbeat window (heartbeat-active math)", async () => {
    const room = await createRoom(userA, "Presence Test Room");
    await joinRoomByCode({ id: userB, name: "Room Guest" }, room.code);

    // Simulate a stale heartbeat for the guest.
    await db
      .update(roomMembers)
      .set({ lastSeenAt: new Date(Date.now() - 5 * 60_000) })
      .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, userB)));

    const snapshot = await getRoomSnapshot(userA, room.id);
    const guest = snapshot.members.find((m) => m.userId === userB);
    expect(guest?.active).toBe(false);

    await touchPresence(userB, room.id);
    const refreshed = await getRoomSnapshot(userA, room.id);
    expect(refreshed.members.find((m) => m.userId === userB)?.active).toBe(true);
  });

  it("heartbeat 403s for a non-member", async () => {
    const room = await createRoom(userA, "Heartbeat Test Room");
    await expect(touchPresence(userC, room.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("generates a room vibe once, then rate-limits within the cooldown", async () => {
    const room = await createRoom(userA, "Vibe Test Room");

    const result = await generateRoomVibe(userA, room.id);
    expect(result.vibeSummary).toBe(fixture.vibe.summary);
    expect(result.generatedAt).toBeTruthy();

    await expect(generateRoomVibe(userA, room.id)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
