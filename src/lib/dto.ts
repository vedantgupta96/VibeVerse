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
