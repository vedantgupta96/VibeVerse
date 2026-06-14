"use client";

import Image from "next/image";
import { Music } from "lucide-react";
import { PreviewButton } from "@/components/tracks/PreviewButton";
import { formatDuration } from "@/lib/utils";
import type { TrackDTO } from "@/lib/dto";

export function TrackCard({ track }: { track: TrackDTO }) {
  return (
    <div className="group flex items-center gap-3 rounded-md border border-transparent p-2 transition-colors hover:border-border hover:bg-space-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-space-3">
        {track.albumImageUrl ? (
          <Image
            src={track.albumImageUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-faint">
            <Music className="size-5" aria-hidden />
          </div>
        )}
        {track.previewUrl && (
          <PreviewButton
            track={{
              id: track.providerId,
              title: track.title,
              artistName: track.artist.name,
              previewUrl: track.previewUrl,
              albumImageUrl: track.albumImageUrl,
            }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-star">{track.title}</p>
        <p className="truncate text-xs text-stardust">{track.artist.name}</p>
      </div>

      <span className="font-mono text-xs text-faint tabular-nums">
        {formatDuration(track.durationMs)}
      </span>
    </div>
  );
}
