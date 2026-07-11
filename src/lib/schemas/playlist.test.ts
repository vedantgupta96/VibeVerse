import { describe, expect, it } from "vitest";
import { generatePlaylistSchema } from "./playlist";

describe("generatePlaylistSchema", () => {
  it("trims and accepts a useful prompt", () => {
    expect(
      generatePlaylistSchema.parse({ prompt: "  rainy train ride home  " }),
    ).toEqual({ prompt: "rainy train ride home" });
  });

  it("rejects prompts outside the 3–300 character range", () => {
    expect(() => generatePlaylistSchema.parse({ prompt: " x " })).toThrow();
    expect(() =>
      generatePlaylistSchema.parse({ prompt: "x".repeat(301) }),
    ).toThrow();
  });
});
