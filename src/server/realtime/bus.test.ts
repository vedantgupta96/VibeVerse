import { describe, expect, it, vi } from "vitest";
import { publishRoomEvent, subscribeToRoom } from "./bus";

// These tests exercise the in-process bus backend, which is what's active
// whenever REDIS_URL isn't set in the test environment (the default here —
// see ARCHITECTURE.md → Realtime for the Redis-vs-in-process fallback ladder).

describe("bus (in-process backend)", () => {
  it("delivers a published event to a subscribed handler", async () => {
    const roomId = crypto.randomUUID();
    const handler = vi.fn();
    const unsubscribe = await subscribeToRoom(roomId, handler);

    await publishRoomEvent(roomId, { type: "queue_updated" });

    expect(handler).toHaveBeenCalledExactlyOnceWith({ type: "queue_updated" });
    unsubscribe();
  });

  it("stops delivering events after unsubscribe", async () => {
    const roomId = crypto.randomUUID();
    const handler = vi.fn();
    const unsubscribe = await subscribeToRoom(roomId, handler);
    unsubscribe();

    await publishRoomEvent(roomId, { type: "queue_updated" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates channels: events for one room never reach another room's subscribers", async () => {
    const roomA = crypto.randomUUID();
    const roomB = crypto.randomUUID();
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const unsubA = await subscribeToRoom(roomA, handlerA);
    const unsubB = await subscribeToRoom(roomB, handlerB);

    await publishRoomEvent(roomA, { type: "now_playing", queueItemId: "x" });

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
    unsubA();
    unsubB();
  });

  it("isolates handler errors: one throwing handler doesn't block others on the same channel", async () => {
    const roomId = crypto.randomUUID();
    const failing = vi.fn(() => {
      throw new Error("boom");
    });
    const succeeding = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const unsub1 = await subscribeToRoom(roomId, failing);
    const unsub2 = await subscribeToRoom(roomId, succeeding);

    await publishRoomEvent(roomId, { type: "member_left", userId: "u1" });

    expect(failing).toHaveBeenCalledTimes(1);
    expect(succeeding).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
    unsub1();
    unsub2();
  });

  it("supports multiple independent subscribers on the same room", async () => {
    const roomId = crypto.randomUUID();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsub1 = await subscribeToRoom(roomId, handler1);
    const unsub2 = await subscribeToRoom(roomId, handler2);

    await publishRoomEvent(roomId, { type: "queue_updated" });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    unsub1();
    unsub2();
  });
});
