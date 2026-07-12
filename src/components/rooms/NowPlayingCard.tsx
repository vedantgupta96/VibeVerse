"use client";

import Image from "next/image";
import { Music, SkipForward } from "lucide-react";
import { PreviewButton } from "@/components/tracks/PreviewButton";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { RoomSnapshotDTO } from "@/lib/dto";

export function NowPlayingCard({
  room,
  onAdvance,
  advancing,
}: {
  room: RoomSnapshotDTO;
  onAdvance: () => void;
  advancing: boolean;
}) {
  const item = room.nowPlaying;

  return (
    <section className="glass rounded-lg p-5 sm:p-6" aria-labelledby="now-playing-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="now-playing-title"
          className="text-xs font-medium uppercase tracking-wide text-stardust"
        >
          Now playing
        </h2>
        {room.isOwner && (
          <Button
            variant="outline"
            onClick={onAdvance}
            disabled={advancing}
            className="min-h-9 px-4 text-xs"
          >
            <SkipForward className="size-3.5" aria-hidden />
            {advancing ? "Advancing…" : "Next track"}
          </Button>
        )}
      </div>

      {item ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="group relative size-20 shrink-0 overflow-hidden rounded-md bg-space-3">
            {item.track.albumImageUrl ? (
              <Image
                src={item.track.albumImageUrl}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-faint">
                <Music className="size-6" aria-hidden />
              </div>
            )}
            {item.track.previewUrl && (
              <PreviewButton
                track={{
                  id: item.track.providerId,
                  title: item.track.title,
                  artistName: item.track.artist.name,
                  previewUrl: item.track.previewUrl,
                  albumImageUrl: item.track.albumImageUrl,
                }}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-medium">
              {item.track.title}
            </p>
            <p className="truncate text-sm text-stardust">{item.track.artist.name}</p>
            <p className="mt-1 font-mono text-xs text-faint">
              {formatDuration(item.track.durationMs)}
            </p>
            {!item.track.previewUrl && (
              <p className="mt-1 text-xs text-faint">No preview available</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stardust">
          {room.isOwner
            ? "Nothing's playing yet — hit “Next track” once the queue has something in it."
            : "Nothing's playing yet. Waiting on the room owner to start something."}
        </p>
      )}
    </section>
  );
}
