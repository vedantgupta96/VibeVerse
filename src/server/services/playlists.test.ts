import "dotenv/config";
import { describe, expect, it } from "vitest";
import type { MusicProvider, ProviderTrack } from "@/server/music/provider";
import {
  artistLooselyMatches,
  resolvePlaylistCandidates,
} from "./playlists";

function track(providerId: string, artist = "Beyoncé"): ProviderTrack {
  return {
    provider: "deezer",
    providerId,
    title: "Haunted",
    durationMs: 360_000,
    previewUrl: null,
    albumName: "Beyoncé",
    albumImageUrl: null,
    artist: {
      provider: "deezer",
      providerId: `artist-${providerId}`,
      name: artist,
      imageUrl: null,
      genres: [],
    },
  };
}

function provider(search: MusicProvider["searchTracks"]): MusicProvider {
  return {
    searchTracks: search,
    searchArtists: async () => [],
    getTrack: async () => null,
  };
}

const candidates = [
  { artist: "Beyonce", title: "Haunted", reason: "A spectral pulse." },
  { artist: "Beyoncé featuring X", title: "Haunted", reason: "Duplicate." },
  { artist: "Different Artist", title: "Elsewhere", reason: "A turn." },
];

describe("playlist candidate resolution", () => {
  it("accepts accents and featuring credits in artist comparisons", () => {
    expect(artistLooselyMatches("Beyonce", "Beyoncé")).toBe(true);
    expect(artistLooselyMatches("The National", "National")).toBe(true);
    expect(artistLooselyMatches("Beyoncé featuring Jay-Z", "Beyoncé")).toBe(true);
    expect(artistLooselyMatches("Beyonce", "Different Artist")).toBe(false);
  });

  it("drops mismatches and deduplicates provider IDs in candidate order", async () => {
    const result = await resolvePlaylistCandidates(
      candidates,
      provider(async (query) => {
        if (query.startsWith("Different")) return [track("2", "Wrong Artist")];
        return [track("1")];
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].track.providerId).toBe("1");
    expect(result[0].reason).toBe("A spectral pulse.");
  });

  it("distinguishes a total catalog outage", async () => {
    await expect(
      resolvePlaylistCandidates(
        candidates,
        provider(async () => {
          throw new Error("offline");
        }),
      ),
    ).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: "The music catalog is temporarily unavailable",
    });
  });
});
