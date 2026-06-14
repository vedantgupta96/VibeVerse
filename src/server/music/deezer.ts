import "server-only";
import { ApiError } from "@/lib/errors";
import type {
  MusicProvider,
  ProviderArtist,
  ProviderTrack,
} from "./provider";

const BASE_URL = "https://api.deezer.com";
const TIMEOUT_MS = 5000;

/* ----------------------------- raw Deezer types --------------------------- */

type DeezerArtistRaw = {
  id: number | string;
  name: string;
  picture_medium?: string;
  picture_big?: string;
};

type DeezerAlbumRaw = {
  id?: number | string;
  title?: string;
  cover_medium?: string;
  cover_big?: string;
};

type DeezerTrackRaw = {
  id: number | string;
  title: string;
  duration?: number; // seconds
  preview?: string;
  album?: DeezerAlbumRaw;
  artist: DeezerArtistRaw;
};

type DeezerError = { error?: { type?: string; message?: string; code?: number } };

/* --------------------------- pure normalizers ----------------------------- */

export function normalizeArtist(
  raw: DeezerArtistRaw,
  genres: string[] = [],
): ProviderArtist {
  return {
    provider: "deezer",
    providerId: String(raw.id),
    name: raw.name,
    imageUrl: raw.picture_big || raw.picture_medium || null,
    genres,
  };
}

export function normalizeTrack(
  raw: DeezerTrackRaw,
  genres: string[] = [],
): ProviderTrack {
  return {
    provider: "deezer",
    providerId: String(raw.id),
    title: raw.title,
    durationMs: (raw.duration ?? 0) * 1000,
    previewUrl: raw.preview || null,
    albumName: raw.album?.title ?? null,
    albumImageUrl: raw.album?.cover_big || raw.album?.cover_medium || null,
    artist: normalizeArtist(raw.artist, genres),
  };
}

/* ------------------------------- transport -------------------------------- */

async function deezerFetch<T>(path: string): Promise<T & DeezerError> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError("PROVIDER_UNAVAILABLE", "Music provider is unreachable");
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new ApiError("PROVIDER_UNAVAILABLE", "Music provider returned an error");
  }
  return res.json();
}

async function fetchAlbumGenres(albumId: number | string | undefined) {
  if (albumId === undefined) return [];
  try {
    const album = await deezerFetch<{
      genres?: { data?: { name?: string }[] };
    }>(`/album/${encodeURIComponent(String(albumId))}`);
    return (album.genres?.data ?? [])
      .map((g) => g.name)
      .filter((name): name is string => Boolean(name));
  } catch {
    return []; // best-effort: never block on genre enrichment
  }
}

/* ------------------------------- provider --------------------------------- */

export const musicProvider: MusicProvider = {
  async searchTracks(query, limit = 20) {
    const data = await deezerFetch<{ data?: DeezerTrackRaw[] }>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    if (data.error) {
      throw new ApiError("PROVIDER_UNAVAILABLE", "Music search failed");
    }
    return (data.data ?? []).map((t) => normalizeTrack(t));
  },

  async searchArtists(query, limit = 20) {
    const data = await deezerFetch<{ data?: DeezerArtistRaw[] }>(
      `/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    if (data.error) {
      throw new ApiError("PROVIDER_UNAVAILABLE", "Artist search failed");
    }
    return (data.data ?? []).map((a) => normalizeArtist(a));
  },

  async getTrack(providerId) {
    const raw = await deezerFetch<DeezerTrackRaw>(
      `/track/${encodeURIComponent(providerId)}`,
    );
    if (raw.error) return null; // unknown id → not found
    const genres = await fetchAlbumGenres(raw.album?.id);
    return normalizeTrack(raw, genres);
  },
};
