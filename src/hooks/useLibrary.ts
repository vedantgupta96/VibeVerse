"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { TrackDTO } from "@/lib/dto";

type LibraryPage = { tracks: TrackDTO[]; nextCursor: string | null };

export function useLibrary() {
  return useInfiniteQuery({
    queryKey: ["library"],
    queryFn: ({ pageParam }) =>
      apiFetch<LibraryPage>(
        `/api/library?limit=30${
          pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
