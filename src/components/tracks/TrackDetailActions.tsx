"use client";

import { Pause, Play } from "lucide-react";
import { SaveButton } from "@/components/tracks/SaveButton";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/player";
import type { TrackDTO } from "@/lib/dto";

export function TrackDetailActions({ track }: { track: TrackDTO }) {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);
  const playing = current?.id === track.providerId && isPlaying;

  return (
    <div className="flex items-center gap-3">
      {track.previewUrl && (
        <Button
          onClick={() =>
            toggle({
              id: track.providerId,
              title: track.title,
              artistName: track.artist.name,
              previewUrl: track.previewUrl!,
              albumImageUrl: track.albumImageUrl,
            })
          }
        >
          {playing ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
          {playing ? "Pause" : "Preview"}
        </Button>
      )}
      <SaveButton track={track} />
    </div>
  );
}
