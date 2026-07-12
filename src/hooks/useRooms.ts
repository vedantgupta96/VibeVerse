"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { RoomSummaryDTO } from "@/lib/dto";

type RoomsPage = { rooms: RoomSummaryDTO[]; nextCursor: string | null };

export function useRooms() {
  return useInfiniteQuery({
    queryKey: ["rooms"],
    queryFn: ({ pageParam }) =>
      apiFetch<RoomsPage>(
        `/api/rooms?limit=20${
          pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ room: RoomSummaryDTO }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useJoinRoomByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<{ room: RoomSummaryDTO }>("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
