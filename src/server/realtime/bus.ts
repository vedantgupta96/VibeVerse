import "server-only";
import Redis from "ioredis";
import { env } from "@/lib/env";
import type { RoomEvent } from "@/lib/realtime";

type Handler = (event: RoomEvent) => void;

function channelFor(roomId: string): string {
  return `room:${roomId}`;
}

/* -------------------------------------------------------------------------- */
/* In-process bus: always live, regardless of backend. When REDIS_URL is      */
/* unset this *is* the whole bus (full realtime within one Node process —    */
/* fine for dev/demo). When Redis is configured, it's the local fan-out layer */
/* that the Redis subscriber's message handler feeds into (see below), so a  */
/* single shared subscriber connection serves every room on this instance.   */
/*                                                                            */
/* Cached on globalThis so Next.js dev-server HMR reuses one Map instead of   */
/* orphaning subscribers on every module reload — same pattern as the pgPool  */
/* singleton in server/db/index.ts.                                          */
/* -------------------------------------------------------------------------- */

const globalForBus = globalThis as unknown as {
  roomBusHandlers?: Map<string, Set<Handler>>;
  roomBusRedisPub?: Redis;
  roomBusRedisSub?: Redis;
};

const handlers: Map<string, Set<Handler>> =
  globalForBus.roomBusHandlers ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForBus.roomBusHandlers = handlers;
}

function publishInProcess(channel: string, event: RoomEvent): void {
  const set = handlers.get(channel);
  if (!set) return;
  // Isolate handler failures: one bad subscriber must never block delivery
  // to the others on the same channel.
  for (const handler of set) {
    try {
      handler(event);
    } catch (error) {
      console.error("[realtime] handler failed:", error);
    }
  }
}

function subscribeInProcess(channel: string, handler: Handler): () => void {
  let set = handlers.get(channel);
  if (!set) {
    set = new Set();
    handlers.set(channel, set);
  }
  set.add(handler);
  return () => {
    set!.delete(handler);
    if (set!.size === 0) handlers.delete(channel);
  };
}

/* -------------------------------------------------------------------------- */
/* Redis backend (REDIS_URL set): two ioredis clients — a subscriber          */
/* connection can't issue other commands, so publish and subscribe need      */
/* separate clients. The subscriber's `message` handler re-publishes into    */
/* the in-process Map above, so route handlers only ever register against    */
/* the local bus regardless of backend.                                      */
/* -------------------------------------------------------------------------- */

function getRedisClients(): { pub: Redis; sub: Redis } | null {
  if (!env.REDIS_URL) return null;

  if (!globalForBus.roomBusRedisPub) {
    const pub = new Redis(env.REDIS_URL);
    pub.on("error", (error) =>
      console.error("[realtime] redis publisher error:", error),
    );
    globalForBus.roomBusRedisPub = pub;
  }
  if (!globalForBus.roomBusRedisSub) {
    const sub = new Redis(env.REDIS_URL);
    sub.on("error", (error) =>
      console.error("[realtime] redis subscriber error:", error),
    );
    sub.on("message", (channel: string, message: string) => {
      let event: RoomEvent;
      try {
        event = JSON.parse(message);
      } catch {
        return;
      }
      publishInProcess(channel, event);
    });
    globalForBus.roomBusRedisSub = sub;
  }
  return { pub: globalForBus.roomBusRedisPub, sub: globalForBus.roomBusRedisSub };
}

/**
 * Publish a room event to every subscriber, on this instance and (with Redis
 * configured) every other instance. Never throws: fan-out is best-effort, so
 * a Redis hiccup must not turn a queue/vote mutation into a 500. Falls back
 * to in-process delivery on publish failure so same-instance subscribers
 * (the common single-instance dev/demo case) still see the event.
 */
export async function publishRoomEvent(
  roomId: string,
  event: RoomEvent,
): Promise<void> {
  const channel = channelFor(roomId);
  const redis = getRedisClients();
  if (redis) {
    try {
      await redis.pub.publish(channel, JSON.stringify(event));
      return;
    } catch (error) {
      console.error("[realtime] redis publish failed:", error);
    }
  }
  publishInProcess(channel, event);
}

/**
 * Subscribe to a room's events. Returns an unsubscribe function. With Redis
 * configured, ensures the shared subscriber connection is listening on the
 * channel and drops it once the last local handler for that channel unsubscribes.
 */
export async function subscribeToRoom(
  roomId: string,
  handler: Handler,
): Promise<() => void> {
  const channel = channelFor(roomId);
  const redis = getRedisClients();
  const unsubscribeLocal = subscribeInProcess(channel, handler);

  if (redis) {
    try {
      await redis.sub.subscribe(channel);
    } catch (error) {
      console.error("[realtime] redis subscribe failed:", error);
    }
  }

  return () => {
    unsubscribeLocal();
    if (redis && !handlers.has(channel)) {
      redis.sub
        .unsubscribe(channel)
        .catch((error) =>
          console.error("[realtime] redis unsubscribe failed:", error),
        );
    }
  };
}
