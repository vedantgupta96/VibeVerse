"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { TasteProfileDTO } from "@/lib/dto";

const tasteProfileKey = ["taste-profile"] as const;

type TasteProfileResponse = { profile: TasteProfileDTO | null };

export function useTasteProfile() {
  return useQuery({
    queryKey: tasteProfileKey,
    queryFn: () => apiFetch<TasteProfileResponse>("/api/taste-profile"),
  });
}

export function useRefreshTasteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ profile: TasteProfileDTO }>("/api/taste-profile/refresh", {
        method: "POST",
      }),
    onSuccess: ({ profile }) => {
      queryClient.setQueryData<TasteProfileResponse>(tasteProfileKey, { profile });
    },
  });
}
