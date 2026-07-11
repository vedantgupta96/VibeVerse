"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Music, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/tracks/PreviewButton";
import { SaveButton } from "@/components/tracks/SaveButton";
import { Button } from "@/components/ui/button";
import { useDeletePlaylist, usePlaylist } from "@/hooks/usePlaylists";
import { formatDuration } from "@/lib/utils";
import type { PlaylistTrackDTO } from "@/lib/dto";

export function PlaylistDetail({ id }: { id: string }) {
  const router = useRouter();
  const query = usePlaylist(id);
  const deletion = useDeletePlaylist();

  if (query.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center gap-2 text-sm text-stardust">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Recalling this transmission…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Playlist out of range</h1>
        <p className="mt-3 text-sm leading-6 text-stardust">
          This transmission isn’t available to this account, or it no longer exists.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/dj")}>
          Return to AI DJ
        </Button>
      </div>
    );
  }

  const playlist = query.data.playlist;
  return (
    <article className="mx-auto max-w-5xl">
      <header className="relative overflow-hidden border-b border-border pb-10 pt-5 sm:pb-14 sm:pt-10">
        <div
          className="pointer-events-none absolute -left-32 -top-52 size-[36rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(225,78,207,.15), transparent 67%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p className="font-mono text-xs text-aurora-cyan">
            Generated {new Intl.DateTimeFormat(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(playlist.createdAt))}
          </p>
          <h1 className="mt-4 text-balance font-display text-4xl font-semibold tracking-[-.03em] sm:text-6xl">
            {playlist.title}
          </h1>
          <p className="mt-5 text-pretty text-base leading-8 text-stardust">
            {playlist.vibeDescription}
          </p>
          <p className="mt-6 text-sm text-star">
            <span className="text-stardust">Your signal:</span> “{playlist.prompt}”
          </p>
        </div>
      </header>

      {playlist.sparse ? (
        <div className="my-7 flex items-start gap-3 rounded-md bg-aurora-amber/10 px-4 py-3 text-sm leading-6 text-star">
          <AlertTriangle className="mt-1 size-4 shrink-0 text-aurora-amber" aria-hidden />
          <p>
            This is a short transmission. The catalog could only verify a few of the
            DJ’s selections, so we kept the real matches instead of filling the list.
          </p>
        </div>
      ) : null}

      <section className="py-8 sm:py-10" aria-labelledby="track-list-title">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="track-list-title" className="font-display text-2xl font-semibold">
            The records
          </h2>
          <span className="font-mono text-xs text-faint">
            {playlist.tracks.length} {playlist.tracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {playlist.tracks.map((item) => (
            <PlaylistTrackRow key={item.track.providerId} item={item} />
          ))}
        </ol>
      </section>

      <footer className="flex justify-end border-t border-border py-8">
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          disabled={deletion.isPending}
          onClick={() => {
            const confirmed = window.confirm(
              `Delete “${playlist.title}”? This can’t be undone.`,
            );
            if (!confirmed) return;
            deletion.mutate(playlist.id, { onSuccess: () => router.push("/dj") });
          }}
        >
          {deletion.isPending ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
          Delete playlist
        </Button>
      </footer>
    </article>
  );
}

function PlaylistTrackRow({ item }: { item: PlaylistTrackDTO }) {
  const { track } = item;
  return (
    <li className="group grid gap-3 py-4 sm:grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <span className="hidden text-center font-mono text-xs text-faint sm:block">
        {String(item.position).padStart(2, "0")}
      </span>
      <div className="relative size-14 overflow-hidden rounded-md bg-space-2">
        {track.albumImageUrl ? (
          <Image src={track.albumImageUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-faint">
            <Music className="size-5" aria-hidden />
          </span>
        )}
        {track.previewUrl ? (
          <PreviewButton
            track={{
              id: track.providerId,
              title: track.title,
              artistName: track.artist.name,
              previewUrl: track.previewUrl,
              albumImageUrl: track.albumImageUrl,
            }}
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-faint sm:hidden">
            {String(item.position).padStart(2, "0")}
          </span>
          <h3 className="truncate text-sm font-medium text-star">{track.title}</h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-stardust">{track.artist.name}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust">
          {item.reason}
        </p>
      </div>
      <div className="flex items-center justify-end gap-1 sm:pl-3">
        <span className="mr-2 font-mono text-[11px] text-faint">
          {formatDuration(track.durationMs)}
        </span>
        <SaveButton track={track} />
      </div>
    </li>
  );
}
