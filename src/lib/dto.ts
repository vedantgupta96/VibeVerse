// Response DTOs shared between the API routes and the client.
// Mirrors API_CONTRACTS.md → Shared DTOs.

import type { Mood } from "@/lib/moods";

export type ArtistRefDTO = {
  id: string | null; // our UUID once persisted, else null
  providerId: string;
  name: string;
  imageUrl: string | null;
};

export type TrackDTO = {
  id: string | null; // our UUID for persisted tracks, else null
  provider: "deezer";
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artist: ArtistRefDTO;
  saved: boolean;
};

export type ArtistResultDTO = {
  providerId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
};

export type SearchResponse = {
  tracks?: TrackDTO[];
  artists?: ArtistResultDTO[];
};

export type MemoryDTO = {
  id: string;
  content: string;
  mood: Mood | null;
  track: TrackDTO;
  createdAt: string;
  updatedAt: string;
};

export type MemorySearchResultDTO = MemoryDTO & { similarity: number };

export type PlaylistTrackDTO = {
  position: number;
  reason: string;
  track: TrackDTO;
};

export type PlaylistDTO = {
  id: string;
  title: string;
  prompt: string;
  vibeDescription: string;
  createdAt: string;
  tracks: PlaylistTrackDTO[];
  sparse: boolean;
};

export type PlaylistSummaryDTO = {
  id: string;
  title: string;
  prompt: string;
  vibeDescription: string;
  trackCount: number;
  createdAt: string;
};

export type TasteGenreDTO = {
  name: string;
  count: number;
};

export type TasteArtistDTO = {
  id: string;
  name: string;
  imageUrl: string | null;
  count: number;
};

export type TasteMoodDTO = {
  mood: Mood;
  count: number;
};

export type TasteProfileDTO = {
  summary: string;
  listenerArchetype: string;
  traits: string[];
  topGenres: TasteGenreDTO[];
  topArtists: TasteArtistDTO[];
  moodDistribution: TasteMoodDTO[];
  generatedAt: string;
};

export type GalaxyGenreNodeDTO = {
  id: string;
  kind: "genre";
  label: string;
  weight: number;
};

export type GalaxyArtistNodeDTO = {
  id: string;
  kind: "artist";
  label: string;
  imageUrl: string | null;
  weight: number;
  trackIds: string[];
};

export type GalaxyNodeDTO = GalaxyGenreNodeDTO | GalaxyArtistNodeDTO;

export type GalaxyEdgeDTO = {
  source: string;
  target: string;
  kind: "genre-artist" | "shared-genre";
  weight?: number;
};

export type GalaxyResponse = {
  nodes: GalaxyNodeDTO[];
  edges: GalaxyEdgeDTO[];
  tracks: TrackDTO[];
};
