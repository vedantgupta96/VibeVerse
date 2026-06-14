"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { SearchResponse } from "@/lib/dto";
import type { SearchType } from "@/lib/schemas/search";

export function useSearch(query: string, type: SearchType) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = debounced.length >= 1;

  return useQuery({
    queryKey: ["search", type, debounced],
    queryFn: () =>
      apiFetch<SearchResponse>(
        `/api/search?q=${encodeURIComponent(debounced)}&type=${type}`,
      ),
    enabled,
  });
}
