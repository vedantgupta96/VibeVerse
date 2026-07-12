import { describe, expect, it } from "vitest";
import { generateRoomCode } from "./rooms";

const UNAMBIGUOUS_CHARSET = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;

describe("generateRoomCode", () => {
  it("is 6 characters long", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("only uses the unambiguous charset (no I, L, O, 0, 1)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(UNAMBIGUOUS_CHARSET);
      expect(code).not.toMatch(/[ILO01]/);
    }
  });

  it("produces varied codes across many calls", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRoomCode()));
    // 31^6 possibilities — 200 draws should essentially never collide.
    expect(codes.size).toBeGreaterThan(190);
  });
});
