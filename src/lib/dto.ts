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

// Vibe Rooms (Phase 10). See API_CONTRACTS.md → Vibe Rooms.

export type RoomSummaryDTO = {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  memberCount: number;
  activeCount: number;
  createdAt: string;
};

export type RoomMemberDTO = {
  userId: string;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
  active: boolean; // computed: lastSeenAt within the last 60s
};

export type RoomQueueItemDTO = {
  id: string;
  status: "queued" | "playing" | "played";
  addedByUserId: string;
  createdAt: string;
  track: TrackDTO;
  voteScore: number;
  myVote: 1 | -1 | null;
};

export type RoomSnapshotDTO = {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  createdAt: string;
  members: RoomMemberDTO[];
  nowPlaying: RoomQueueItemDTO | null;
  queue: RoomQueueItemDTO[];
  vibeSummary: string | null;
  vibeSummaryAt: string | null;
};
