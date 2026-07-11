import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
import { buildGalaxyGraph, type GalaxyTrackRow } from "./galaxy";

function row(
  trackId: string,
  artistId: string,
  artistName: string,
  genres: string[],
  savedAt = new Date("2026-01-01T00:00:00Z"),
): GalaxyTrackRow {
  return {
    savedAt,
    trackId,
    providerId: `provider-${trackId}`,
    title: `Track ${trackId}`,
    durationMs: 180_000,
    previewUrl: null,
    albumName: null,
    albumImageUrl: null,
    artistId,
    artistProviderId: `provider-${artistId}`,
    artistName,
    artistImageUrl: null,
    artistGenres: genres,
  };
}

describe("buildGalaxyGraph", () => {
  it("weights artists and genres by saved tracks, dedupes, and orders tracks newest first", () => {
    const graph = buildGalaxyGraph([
      row("old", "a", "Alpha", ["Electronic"], new Date("2026-01-01")),
      row("new", "a", "Alpha", [" electronic "], new Date("2026-01-03")),
      row("new", "a", "Alpha", ["electronic"], new Date("2026-01-02")),
    ]);

    expect(graph.tracks.map((track) => track.id)).toEqual(["new", "old"]);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "genre:electronic", weight: 2 }),
        expect.objectContaining({ id: "artist:a", weight: 2, trackIds: ["new", "old"] }),
      ]),
    );
    expect(graph.tracks.every((track) => track.saved)).toBe(true);
  });

  it("normalizes genre case and whitespace while preserving a readable label", () => {
    const graph = buildGalaxyGraph([
      row("1", "a", "Alpha", ["  Neo   Soul  "]),
      row("2", "b", "Beta", ["neo soul"]),
    ]);
    const genres = graph.nodes.filter((node) => node.kind === "genre");
    expect(genres).toEqual([
      { id: "genre:neo%20soul", kind: "genre", label: "neo soul", weight: 2 },
    ]);
  });

  it("keeps genre-less artists isolated and weights shared genre edges", () => {
    const graph = buildGalaxyGraph([
      row("1", "a", "Alpha", ["Ambient", "Electronic"]),
      row("2", "b", "Beta", ["ambient", " electronic "]),
      row("3", "c", "Quiet", []),
    ]);
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({ id: "artist:c", kind: "artist", weight: 1 }),
    );
    expect(graph.edges).toContainEqual({
      source: "artist:a",
      target: "artist:b",
      kind: "shared-genre",
      weight: 2,
    });
    expect(graph.edges.some((edge) => edge.source === "artist:c" || edge.target === "artist:c")).toBe(false);
  });

  it("is independent of input order", () => {
    const rows = [
      row("1", "b", "Beta", ["Pop"]),
      row("2", "a", "Alpha", ["Pop", "Rock"]),
    ];
    expect(buildGalaxyGraph(rows)).toEqual(buildGalaxyGraph([...rows].reverse()));
  });
});
