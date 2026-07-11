import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("@/server/ai/client", () => ({
  models: { default: "test-model" },
  getAnthropicClient: () => ({ messages: { parse: mocks.parse } }),
}));

import {
  generatePlaylistConcept,
  PlaylistConceptSchema,
} from "./playlist";

const concept = {
  title: "Signal After Midnight",
  vibeDescription:
    "A patient electronic arc for the hours when the city goes quiet. It starts weightless, gathers a pulse, and lands softly before sunrise.",
  candidates: Array.from({ length: 12 }, (_, index) => ({
    artist: `Artist ${index}`,
    title: `Track ${index}`,
    reason: `It carries chapter ${index} of the nocturnal arc.`,
  })),
};

describe("playlist concept generation", () => {
  beforeEach(() => mocks.parse.mockReset());

  it("validates the exact structured concept shape", () => {
    expect(PlaylistConceptSchema.parse(concept)).toEqual(concept);
    expect(() =>
      PlaylistConceptSchema.parse({ ...concept, candidates: concept.candidates.slice(0, 11) }),
    ).toThrow();
  });

  it("returns parsed structured output with the configured model", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: concept });
    await expect(
      generatePlaylistConcept("late-night code", {
        topGenres: [],
        topArtists: [],
        memories: [],
      }),
    ).resolves.toEqual(concept);
    expect(mocks.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        max_tokens: 16_000,
        thinking: { type: "adaptive" },
      }),
    );
  });

  it("maps a refusal before reading parsed output", async () => {
    mocks.parse.mockResolvedValue({ stop_reason: "refusal", parsed_output: concept });
    await expect(
      generatePlaylistConcept("request", {
        topGenres: [],
        topArtists: [],
        memories: [],
      }),
    ).rejects.toMatchObject({ code: "AI_REFUSED", status: 422 });
  });

  it("maps provider and parsing errors without leaking raw messages", async () => {
    mocks.parse.mockImplementationOnce(async () => {
      throw new Error("secret provider payload");
    });
    await expect(
      generatePlaylistConcept("request", {
        topGenres: [],
        topArtists: [],
        memories: [],
      }),
    ).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      message: "The AI DJ is temporarily unavailable",
    });
  });
});
