"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { TrackDTO } from "@/lib/dto";

export function SaveButton({ track }: { track: TrackDTO }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(track.saved);
  const [trackId, setTrackId] = useState<string | null>(track.id);

  const mutation = useMutation({
    mutationFn: async (next: boolean): Promise<string | null> => {
      if (next) {
        const res = await apiFetch<{ track: TrackDTO }>("/api/tracks/save", {
          method: "POST",
          body: JSON.stringify({
            provider: track.provider,
            providerId: track.providerId,
          }),
        });
        return res.track.id;
      }
      if (trackId) {
        await apiFetch(`/api/tracks/save/${trackId}`, { method: "DELETE" });
      }
      return trackId;
    },
    onMutate: (next) => setSaved(next), // optimistic
    onError: (_err, next) => setSaved(!next), // rollback
    onSuccess: (id) => {
      if (id) setTrackId(id);
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate(!saved)}
      disabled={mutation.isPending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from library" : "Save to library"}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-60",
        saved
          ? "text-aurora-magenta hover:bg-space-3"
          : "text-faint hover:bg-space-3 hover:text-stardust",
      )}
    >
      <Heart className={cn("size-5", saved && "fill-current")} />
    </button>
  );
}
