import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("@/server/ai/client", () => ({
  models: { fast: "test-fast-model" },
  getAnthropicClient: () => ({ messages: { parse: mocks.parse } }),
}));

import { generateRoomVibeSummary, RoomVibeSchema } from "./roomVibe";

const vibe = {
  summary:
    "This room is glowing tonight — a dozen ears locked into one late-night groove, riding the queue's momentum together.",
};

const context = {
  roomName: "Late Night Drive",
  activeCount: 4,
  nowPlaying: "Test Song by Test Artist",
  queue: ["Another Song by Another Artist"],
};

describe("room vibe generation", () => {
  beforeEach(() => mocks.parse.mockReset());

  it("validates the strict 40-500 char summary", () => {
    expect(RoomVibeSchema.parse(vibe)).toEqual(vibe);
    expect(() => RoomVibeSchema.parse({ summary: "too short" })).toThrow();
    expect(() => RoomVibeSchema.parse({ ...vibe, extra: true })).toThrow();
  });

  it("calls the fast model with no effort or thinking config (Haiku 4.5 rejects both)", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: vibe });
    await expect(generateRoomVibeSummary(context)).resolves.toEqual(vibe);
    const call = mocks.parse.mock.calls[0][0];
    expect(call.model).toBe("test-fast-model");
    expect(call.output_config.effort).toBeUndefined();
    expect(call.thinking).toBeUndefined();
  });

  it("maps refusals to AI_REFUSED", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "refusal", parsed_output: vibe });
    await expect(generateRoomVibeSummary(context)).rejects.toMatchObject({
      code: "AI_REFUSED",
      status: 422,
    });
  });

  it("maps missing parsed output to AI_UNAVAILABLE", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    await expect(generateRoomVibeSummary(context)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
  });

  it("maps SDK failures without leaking provider details", async () => {
    mocks.parse.mockImplementationOnce(async () => {
      throw new Error("raw secret response");
    });
    await expect(generateRoomVibeSummary(context)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      message: "Reading the room is unavailable right now",
    });
  });
});
