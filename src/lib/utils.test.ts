import { describe, expect, it } from "vitest";
import { formatDuration } from "./utils";

describe("formatDuration", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatDuration(224000)).toBe("3:44");
    expect(formatDuration(65000)).toBe("1:05");
    expect(formatDuration(600000)).toBe("10:00");
  });

  it("guards non-positive and invalid input", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});
