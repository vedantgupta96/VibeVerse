import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import type {
  GalaxyArtistNodeDTO,
  GalaxyEdgeDTO,
  GalaxyGenreNodeDTO,
  GalaxyResponse,
  TrackDTO,
} from "@/lib/dto";
import { db } from "@/server/db";
import { artists, savedTracks, tracks } from "@/server/db/schema";

export type GalaxyTrackRow = {
  savedAt: Date;
  trackId: string;
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artistId: string;
  artistProviderId: string;
  artistName: string;
  artistImageUrl: string | null;
  artistGenres: string[];
};

function cleanGenre(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function genreIdentity(value: string) {
  return cleanGenre(value).toLocaleLowerCase("en-US");
}

function genreNodeId(identity: string) {
  return `genre:${encodeURIComponent(identity)}`;
}

function artistNodeId(id: string) {
  return `artist:${id}`;
}

function stablePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Builds a renderer-independent graph from user-scoped saved-track rows. */
export function buildGalaxyGraph(inputRows: GalaxyTrackRow[]): GalaxyResponse {
  const rows = [...inputRows].sort(
    (a, b) =>
      b.savedAt.getTime() - a.savedAt.getTime() ||
      a.trackId.localeCompare(b.trackId),
  );
  const uniqueRows: GalaxyTrackRow[] = [];
  const seenTracks = new Set<string>();
  for (const row of rows) {
    if (seenTracks.has(row.trackId)) continue;
    seenTracks.add(row.trackId);
    uniqueRows.push(row);
  }

  const trackDtos: TrackDTO[] = uniqueRows.map((row) => ({
    id: row.trackId,
    provider: "deezer",
    providerId: row.providerId,
    title: row.title,
    durationMs: row.durationMs,
    previewUrl: row.previewUrl,
    albumName: row.albumName,
    albumImageUrl: row.albumImageUrl,
    artist: {
      id: row.artistId,
      providerId: row.artistProviderId,
      name: row.artistName,
      imageUrl: row.artistImageUrl,
    },
    saved: true,
  }));

  type ArtistAggregate = {
    id: string;
    name: string;
    imageUrl: string | null;
    trackIds: string[];
    genres: Set<string>;
  };
  const artistMap = new Map<string, ArtistAggregate>();
  const genreLabels = new Map<string, string>();
  const genreWeights = new Map<string, number>();

  for (const row of uniqueRows) {
    let artist = artistMap.get(row.artistId);
    if (!artist) {
      artist = {
        id: row.artistId,
        name: row.artistName,
        imageUrl: row.artistImageUrl,
        trackIds: [],
        genres: new Set(),
      };
      artistMap.set(row.artistId, artist);
    }
    artist.trackIds.push(row.trackId);

    const rowGenres = new Set(
      row.artistGenres.map(genreIdentity).filter(Boolean),
    );
    for (const identity of rowGenres) {
      artist.genres.add(identity);
      genreWeights.set(identity, (genreWeights.get(identity) ?? 0) + 1);
      const candidates = row.artistGenres
        .map(cleanGenre)
        .filter((genre) => genreIdentity(genre) === identity)
        .sort((a, b) => a.localeCompare(b));
      const label = candidates[0] ?? identity;
      const current = genreLabels.get(identity);
      if (!current || label.localeCompare(current) < 0) {
        genreLabels.set(identity, label);
      }
    }
  }

  const artistNodes: GalaxyArtistNodeDTO[] = [...artistMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((artist) => ({
      id: artistNodeId(artist.id),
      kind: "artist",
      label: artist.name,
      imageUrl: artist.imageUrl,
      weight: artist.trackIds.length,
      trackIds: artist.trackIds,
    }));
  const genreNodes: GalaxyGenreNodeDTO[] = [...genreWeights]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([identity, weight]) => ({
      id: genreNodeId(identity),
      kind: "genre",
      label: genreLabels.get(identity) ?? identity,
      weight,
    }));

  const edges: GalaxyEdgeDTO[] = [];
  const genreArtists = new Map<string, string[]>();
  for (const artist of artistMap.values()) {
    for (const genre of artist.genres) {
      edges.push({
        source: genreNodeId(genre),
        target: artistNodeId(artist.id),
        kind: "genre-artist",
      });
      const members = genreArtists.get(genre) ?? [];
      members.push(artistNodeId(artist.id));
      genreArtists.set(genre, members);
    }
  }

  const sharedWeights = new Map<string, number>();
  for (const members of genreArtists.values()) {
    members.sort();
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        const [source, target] = stablePair(members[left], members[right]);
        const key = `${source}\u0000${target}`;
        sharedWeights.set(key, (sharedWeights.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, weight] of [...sharedWeights].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const [source, target] = key.split("\u0000");
    edges.push({ source, target, kind: "shared-genre", weight });
  }

  edges.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target),
  );
  return { nodes: [...genreNodes, ...artistNodes], edges, tracks: trackDtos };
}

export async function getGalaxy(userId: string): Promise<GalaxyResponse> {
  const rows = await db
    .select({
      savedAt: savedTracks.createdAt,
      trackId: tracks.id,
      providerId: tracks.providerId,
      title: tracks.title,
      durationMs: tracks.durationMs,
      previewUrl: tracks.previewUrl,
      albumName: tracks.albumName,
      albumImageUrl: tracks.albumImageUrl,
      artistId: artists.id,
      artistProviderId: artists.providerId,
      artistName: artists.name,
      artistImageUrl: artists.imageUrl,
      artistGenres: artists.genres,
    })
    .from(savedTracks)
    .innerJoin(tracks, eq(savedTracks.trackId, tracks.id))
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .where(eq(savedTracks.userId, userId))
    .orderBy(desc(savedTracks.createdAt), asc(tracks.id));
  return buildGalaxyGraph(rows);
}
