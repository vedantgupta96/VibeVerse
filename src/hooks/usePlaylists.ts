"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PlaylistDTO, PlaylistSummaryDTO } from "@/lib/dto";

const playlistKeys = {
  all: ["playlists"] as const,
  detail: (id: string) => ["playlists", id] as const,
};

export function usePlaylists() {
  return useQuery({
    queryKey: playlistKeys.all,
    queryFn: () =>
      apiFetch<{ playlists: PlaylistSummaryDTO[] }>("/api/playlists"),
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: playlistKeys.detail(id),
    queryFn: () => apiFetch<{ playlist: PlaylistDTO }>(`/api/playlists/${id}`),
    enabled: Boolean(id),
  });
}

export function useGeneratePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) =>
      apiFetch<{ playlist: PlaylistDTO }>("/api/playlists/generate", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }),
    onSuccess: ({ playlist }) => {
      queryClient.setQueryData(playlistKeys.detail(playlist.id), { playlist });
      void queryClient.invalidateQueries({ queryKey: playlistKeys.all });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/playlists/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: playlistKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: playlistKeys.all });
    },
  });
}
