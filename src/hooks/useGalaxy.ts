"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { GalaxyResponse } from "@/lib/dto";

export const galaxyQueryKey = ["galaxy"] as const;

export function useGalaxy() {
  return useQuery({
    queryKey: galaxyQueryKey,
    queryFn: () => apiFetch<GalaxyResponse>("/api/galaxy"),
  });
}
