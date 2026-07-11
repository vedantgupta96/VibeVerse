import "dotenv/config";
import { describe, expect, it } from "vitest";
import { tasteRefreshRetryAfterSeconds } from "./taste";

describe("taste refresh cooldown", () => {
  const now = new Date("2026-07-11T12:00:00.000Z");

  it("rounds a positive remaining cooldown up to whole seconds", () => {
    expect(
      tasteRefreshRetryAfterSeconds(
        new Date("2026-07-11T11:58:00.001Z"),
        now,
      ),
    ).toBe(1);
    expect(
      tasteRefreshRetryAfterSeconds(
        new Date("2026-07-11T11:59:30.500Z"),
        now,
      ),
    ).toBe(91);
  });

  it("returns zero once the cooldown has elapsed", () => {
    expect(
      tasteRefreshRetryAfterSeconds(
        new Date("2026-07-11T11:58:00.000Z"),
        now,
      ),
    ).toBe(0);
  });
});
