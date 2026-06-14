import { describe, expect, it } from "vitest";
import { normalizeArtist, normalizeTrack } from "./deezer";

describe("normalizeArtist", () => {
  it("maps fields and prefers the bigger image", () => {
    const a = normalizeArtist(
      {
        id: 27,
        name: "Daft Punk",
        picture_medium: "https://cdn/m.jpg",
        picture_big: "https://cdn/b.jpg",
      },
      ["electronic"],
    );
    expect(a).toEqual({
      provider: "deezer",
      providerId: "27",
      name: "Daft Punk",
      imageUrl: "https://cdn/b.jpg",
      genres: ["electronic"],
    });
  });

  it("defaults image to null and genres to []", () => {
    const a = normalizeArtist({ id: 1, name: "X" });
    expect(a.imageUrl).toBeNull();
    expect(a.genres).toEqual([]);
  });
});

describe("normalizeTrack", () => {
  it("converts duration to ms and nests the artist", () => {
    const t = normalizeTrack({
      id: 3135556,
      title: "Harder, Better, Faster, Stronger",
      duration: 224,
      preview: "https://cdn/preview.mp3",
      album: { id: 302127, title: "Discovery", cover_big: "https://cdn/c.jpg" },
      artist: { id: 27, name: "Daft Punk" },
    });
    expect(t.providerId).toBe("3135556");
    expect(t.durationMs).toBe(224000);
    expect(t.previewUrl).toBe("https://cdn/preview.mp3");
    expect(t.albumName).toBe("Discovery");
    expect(t.albumImageUrl).toBe("https://cdn/c.jpg");
    expect(t.artist.name).toBe("Daft Punk");
  });

  it("tolerates missing optional fields", () => {
    const t = normalizeTrack({ id: 9, title: "Untitled", artist: { id: 2, name: "Y" } });
    expect(t.durationMs).toBe(0);
    expect(t.previewUrl).toBeNull();
    expect(t.albumName).toBeNull();
    expect(t.albumImageUrl).toBeNull();
  });
});
