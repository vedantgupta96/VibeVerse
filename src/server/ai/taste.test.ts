import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("@/server/ai/client", () => ({
  models: { default: "test-model" },
  getAnthropicClient: () => ({ messages: { parse: mocks.parse } }),
}));

import { generateTasteSummary, TasteSummarySchema } from "./taste";

const summary = {
  summary:
    "You move between luminous electronic detail and close, memory-soaked songwriting, saving music as both atmosphere and emotional landmark.",
  listenerArchetype: "The Memory Cartographer",
  traits: ["Scene-led explorer", "Melody archivist", "Patient genre drifter"],
};

const context = {
  topGenres: [{ name: "electronic", count: 4 }],
  topArtists: [{ id: "artist", name: "Test Artist", imageUrl: null, count: 3 }],
  moodDistribution: [{ mood: "nostalgic" as const, count: 2 }],
  memories: ["A night drive home"],
};

describe("taste summary generation", () => {
  beforeEach(() => mocks.parse.mockReset());

  it("validates the strict output including 3–5 traits", () => {
    expect(TasteSummarySchema.parse(summary)).toEqual(summary);
    expect(() => TasteSummarySchema.parse({ ...summary, traits: ["one", "two"] })).toThrow();
    expect(() => TasteSummarySchema.parse({ ...summary, extra: true })).toThrow();
  });

  it("returns structured output with the default model and adaptive thinking", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: summary });
    await expect(generateTasteSummary(context)).resolves.toEqual(summary);
    expect(mocks.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        max_tokens: 4_000,
        thinking: { type: "adaptive" },
      }),
    );
  });

  it("maps refusals to AI_REFUSED", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "refusal", parsed_output: summary });
    await expect(generateTasteSummary(context)).rejects.toMatchObject({
      code: "AI_REFUSED",
      status: 422,
    });
  });

  it("maps missing parsed output to AI_UNAVAILABLE", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    await expect(generateTasteSummary(context)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      message: "Taste DNA returned an incomplete profile",
    });
  });

  it("maps SDK failures without leaking provider details", async () => {
    mocks.parse.mockImplementationOnce(async () => {
      throw new Error("raw secret response");
    });
    await expect(generateTasteSummary(context)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      message: "Taste DNA is temporarily unavailable",
    });
  });
});
