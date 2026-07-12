"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Music, X } from "lucide-react";
import { PreviewButton } from "@/components/tracks/PreviewButton";
import { Input } from "@/components/ui/input";
import {
  useAddToQueue,
  useCastVote,
  useClearVote,
  useRemoveQueueItem,
} from "@/hooks/useRoom";
import { useSearch } from "@/hooks/useSearch";
import { ApiClientError } from "@/lib/api-client";
import { cn, formatDuration } from "@/lib/utils";
import type { RoomQueueItemDTO, RoomSnapshotDTO } from "@/lib/dto";

function AddTrackInput({ roomId }: { roomId: string }) {
  const [query, setQuery] = useState("");
  const search = useSearch(query, "track");
  const addToQueue = useAddToQueue(roomId);
  const showResults = query.trim().length > 0;

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a track to add…"
        aria-label="Search a track to add to the queue"
      />
      {showResults && (
        <div className="glass absolute inset-x-0 top-full z-10 mt-2 max-h-72 overflow-y-auto p-2">
          {search.isLoading ? (
            <p className="p-3 text-xs text-faint">Searching…</p>
          ) : (search.data?.tracks?.length ?? 0) === 0 ? (
            <p className="p-3 text-xs text-faint">No tracks found</p>
          ) : (
            search.data!.tracks!.map((track) => (
              <button
                key={track.providerId}
                type="button"
                onClick={() => {
                  addToQueue.mutate(track.providerId, {
                    onSuccess: () => setQuery(""),
                  });
                }}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-space-3"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded bg-space-3">
                  {track.albumImageUrl ? (
                    <Image
                      src={track.albumImageUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-faint">
                      <Music className="size-3.5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-star">{track.title}</p>
                  <p className="truncate text-xs text-stardust">{track.artist.name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {addToQueue.isError && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {addToQueue.error instanceof ApiClientError &&
          addToQueue.error.code === "VALIDATION_ERROR"
            ? "That track is already in the queue."
            : "Couldn't add that track. Try again."}
        </p>
      )}
    </div>
  );
}

function QueueRow({
  item,
  roomId,
  isOwner,
  currentUserId,
}: {
  item: RoomQueueItemDTO;
  roomId: string;
  isOwner: boolean;
  currentUserId: string | undefined;
}) {
  const castVote = useCastVote(roomId);
  const clearVote = useClearVote(roomId);
  const removeItem = useRemoveQueueItem(roomId);
  const canRemove = isOwner || item.addedByUserId === currentUserId;

  function vote(value: 1 | -1) {
    if (item.myVote === value) {
      clearVote.mutate(item.id);
    } else {
      castVote.mutate({ itemId: item.id, value });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-space-2">
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={() => vote(1)}
          aria-pressed={item.myVote === 1}
          aria-label="Upvote"
          className={cn(
            "rounded p-1 transition-colors",
            item.myVote === 1 ? "text-aurora-cyan" : "text-faint hover:text-stardust",
          )}
        >
          <ArrowUp className="size-4" />
        </button>
        <span className="font-mono text-xs tabular-nums text-stardust">
          {item.voteScore}
        </span>
        <button
          type="button"
          onClick={() => vote(-1)}
          aria-pressed={item.myVote === -1}
          aria-label="Downvote"
          className={cn(
            "rounded p-1 transition-colors",
            item.myVote === -1 ? "text-aurora-magenta" : "text-faint hover:text-stardust",
          )}
        >
          <ArrowDown className="size-4" />
        </button>
      </div>

      <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-space-3">
        {item.track.albumImageUrl ? (
          <Image
            src={item.track.albumImageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-faint">
            <Music className="size-4" aria-hidden />
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

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-star">{item.track.title}</p>
        <p className="truncate text-xs text-stardust">{item.track.artist.name}</p>
      </div>
      <span className="hidden font-mono text-xs text-faint sm:inline">
        {formatDuration(item.track.durationMs)}
      </span>

      {canRemove && (
        <button
          type="button"
          onClick={() => removeItem.mutate(item.id)}
          aria-label={`Remove ${item.track.title} from the queue`}
          className="rounded p-1.5 text-faint transition-colors hover:bg-space-3 hover:text-danger"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function QueuePanel({
  room,
  currentUserId,
}: {
  room: RoomSnapshotDTO;
  currentUserId: string | undefined;
}) {
  return (
    <section className="glass rounded-lg p-5 sm:p-6" aria-labelledby="queue-title">
      <h2
        id="queue-title"
        className="text-xs font-medium uppercase tracking-wide text-stardust"
      >
        Up next
      </h2>
      <div className="mt-4">
        <AddTrackInput roomId={room.id} />
      </div>
      <div className="mt-4 flex flex-col gap-1">
        {room.queue.length === 0 ? (
          <p className="py-6 text-center text-sm text-stardust">
            The queue is empty — search above to add the first track.
          </p>
        ) : (
          room.queue.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              roomId={room.id}
              isOwner={room.isOwner}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </section>
  );
}
