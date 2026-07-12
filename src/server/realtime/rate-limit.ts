import "server-only";

/**
 * In-memory sliding-window rate limiter, per-instance only. This is
 * abuse-damping for cheap, ephemeral actions (room reactions) — not a
 * security boundary. A multi-instance deployment under-counts slightly
 * (each instance keeps its own window), which only makes the limit a little
 * looser, never stricter or bypassable in a harmful way.
 */

const windows = new Map<string, number[]>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = windows.get(key) ?? [];
  const timestamps = existing.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    windows.set(key, timestamps);
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  windows.set(key, timestamps);
  return { allowed: true };
}
