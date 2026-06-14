// Provider-agnostic music metadata interface. The rest of the app talks only
// to this — no Deezer (or future Spotify) response shapes leak past here.

export interface ProviderArtist {
  provider: "deezer";
  providerId: string;
  name: string;
  imageUrl: string | null;
  genres: string[]; // best-effort; may be [] (Deezer genres come from albums)
}

export interface ProviderTrack {
  provider: "deezer";
  providerId: string;
  title: string;
  durationMs: number;
  previewUrl: string | null;
  albumName: string | null;
  albumImageUrl: string | null;
  artist: ProviderArtist;
}

export interface MusicProvider {
  searchTracks(query: string, limit?: number): Promise<ProviderTrack[]>;
  searchArtists(query: string, limit?: number): Promise<ProviderArtist[]>;
  /** Canonical metadata for one track (used by the save flow). null if unknown. */
  getTrack(providerId: string): Promise<ProviderTrack | null>;
}
