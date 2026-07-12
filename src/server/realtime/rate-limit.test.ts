import { describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 5_000)).toEqual({ allowed: true });
    }
    const blocked = checkRateLimit(key, 5, 5_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(5);
    }
  });

  it("slides the window forward so old timestamps expire", () => {
    vi.useFakeTimers();
    try {
      const key = `test-${crypto.randomUUID()}`;
      for (let i = 0; i < 3; i++) {
        expect(checkRateLimit(key, 3, 1_000).allowed).toBe(true);
      }
      expect(checkRateLimit(key, 3, 1_000).allowed).toBe(false);

      vi.advanceTimersByTime(1_001);
      expect(checkRateLimit(key, 3, 1_000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks independent keys separately", () => {
    const keyA = `test-${crypto.randomUUID()}`;
    const keyB = `test-${crypto.randomUUID()}`;
    expect(checkRateLimit(keyA, 1, 5_000).allowed).toBe(true);
    expect(checkRateLimit(keyA, 1, 5_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 1, 5_000).allowed).toBe(true);
  });
});
