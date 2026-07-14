import { describe, expect, it } from "vitest";
import {
  addToQueueSchema,
  advanceNowPlayingSchema,
  castVoteSchema,
  createRoomSchema,
  joinRoomByCodeSchema,
  reactSchema,
  roomListQuerySchema,
  voteValueSchema,
} from "./room";

describe("createRoomSchema", () => {
  it("accepts a 1-80 char name", () => {
    expect(createRoomSchema.parse({ name: "Late Night Drive" })).toEqual({
      name: "Late Night Drive",
    });
  });

  it("rejects an empty name", () => {
    expect(() => createRoomSchema.parse({ name: "" })).toThrow();
    expect(() => createRoomSchema.parse({ name: "   " })).toThrow();
  });

  it("rejects a name over 80 chars", () => {
    expect(() => createRoomSchema.parse({ name: "x".repeat(81) })).toThrow();
  });
});

describe("joinRoomByCodeSchema (normalization)", () => {
  it("trims whitespace and uppercases the code", () => {
    expect(joinRoomByCodeSchema.parse({ code: "  ab12cd  " })).toEqual({
      code: "AB12CD",
    });
  });

  it("rejects an empty code", () => {
    expect(() => joinRoomByCodeSchema.parse({ code: "" })).toThrow();
    expect(() => joinRoomByCodeSchema.parse({ code: "   " })).toThrow();
  });
});

describe("voteValueSchema / castVoteSchema", () => {
  it("accepts exactly 1 or -1", () => {
    expect(voteValueSchema.parse(1)).toBe(1);
    expect(voteValueSchema.parse(-1)).toBe(-1);
    expect(castVoteSchema.parse({ value: 1 })).toEqual({ value: 1 });
  });

  it("rejects any other value", () => {
    expect(() => voteValueSchema.parse(0)).toThrow();
    expect(() => voteValueSchema.parse(2)).toThrow();
    expect(() => voteValueSchema.parse("1")).toThrow();
  });
});

describe("reactSchema (mood enum)", () => {
  it("accepts a canonical mood", () => {
    expect(reactSchema.parse({ mood: "joyful" })).toEqual({ mood: "joyful" });
  });

  it("rejects an unknown mood", () => {
    expect(() => reactSchema.parse({ mood: "furious" })).toThrow();
  });
});

describe("addToQueueSchema", () => {
  it("accepts a non-empty providerId", () => {
    expect(addToQueueSchema.parse({ providerId: "3135556" })).toEqual({
      providerId: "3135556",
    });
  });

  it("rejects an empty providerId", () => {
    expect(() => addToQueueSchema.parse({ providerId: "" })).toThrow();
  });
});

describe("advanceNowPlayingSchema", () => {
  it("accepts a UUID or null expectation", () => {
    const id = "2f7ecac4-bdd3-4c83-a6bc-1bc1ec93410f";
    expect(
      advanceNowPlayingSchema.parse({ expectedNowPlayingId: id }),
    ).toEqual({ expectedNowPlayingId: id });
    expect(
      advanceNowPlayingSchema.parse({ expectedNowPlayingId: null }),
    ).toEqual({ expectedNowPlayingId: null });
  });

  it("rejects missing, invalid, or additional fields", () => {
    expect(() => advanceNowPlayingSchema.parse({})).toThrow();
    expect(() =>
      advanceNowPlayingSchema.parse({ expectedNowPlayingId: "not-a-uuid" }),
    ).toThrow();
    expect(() =>
      advanceNowPlayingSchema.parse({
        expectedNowPlayingId: null,
        unexpected: true,
      }),
    ).toThrow();
  });
});

describe("roomListQuerySchema", () => {
  it("defaults limit to 20", () => {
    expect(roomListQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("coerces a string limit and rejects out-of-range values", () => {
    expect(roomListQuerySchema.parse({ limit: "10" })).toEqual({ limit: 10 });
    expect(() => roomListQuerySchema.parse({ limit: "0" })).toThrow();
    expect(() => roomListQuerySchema.parse({ limit: "51" })).toThrow();
  });
});
