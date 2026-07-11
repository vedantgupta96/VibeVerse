"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { MemoryDTO, MemorySearchResultDTO } from "@/lib/dto";
import type { Mood } from "@/lib/moods";

type MemoryPage = { memories: MemoryDTO[]; nextCursor: string | null };

export function useMemories(trackId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["memories", trackId ?? "all"],
    queryFn: ({ pageParam }) =>
      apiFetch<MemoryPage>(
        `/api/memories?limit=30${trackId ? `&trackId=${trackId}` : ""}${
          pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

export function useMemorySearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 350);
  return useQuery({
    queryKey: ["memory-search", debounced],
    queryFn: () =>
      apiFetch<{ memories: MemorySearchResultDTO[] }>(
        `/api/memories/search?q=${encodeURIComponent(debounced)}`,
      ),
    enabled: debounced.length >= 1,
    retry: false,
  });
}

function useInvalidateMemories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["memories"] });
}

export function useCreateMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: (input: { trackId: string; content: string; mood: Mood | null }) =>
      apiFetch<{ memory: MemoryDTO }>("/api/memories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      content?: string;
      mood?: Mood | null;
    }) =>
      apiFetch<{ memory: MemoryDTO }>(`/api/memories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/memories/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
