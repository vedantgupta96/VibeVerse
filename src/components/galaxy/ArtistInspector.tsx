"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Music, Pause, Play, X } from "lucide-react";
import { useMemories } from "@/hooks/useMemories";
import type {
  GalaxyArtistNodeDTO,
  GalaxyEdgeDTO,
  GalaxyNodeDTO,
  TrackDTO,
} from "@/lib/dto";
import { MOOD_LABEL } from "@/lib/moods";
import { cn, formatRelativeTime } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player";

function InlinePreview({ track }: { track: TrackDTO }) {
  const current = usePlayerStore((state) => state.current);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const toggle = usePlayerStore((state) => state.toggle);
  if (!track.previewUrl) return <span className="text-xs text-faint">No preview</span>;
  const playing = current?.id === track.providerId && isPlaying;
  return (
    <button
      type="button"
      onClick={() => toggle({
        id: track.providerId,
        title: track.title,
        artistName: track.artist.name,
        previewUrl: track.previewUrl!,
        albumImageUrl: track.albumImageUrl,
      })}
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-stardust hover:bg-space-3 hover:text-star"
      aria-label={playing ? `Pause preview of ${track.title}` : `Play preview of ${track.title}`}
    >
      {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      {playing ? "Pause" : "Preview"}
    </button>
  );
}

export function ArtistInspector({
  artist,
  allNodes,
  edges,
  tracks,
  onClose,
}: {
  artist: GalaxyArtistNodeDTO;
  allNodes: GalaxyNodeDTO[];
  edges: GalaxyEdgeDTO[];
  tracks: TrackDTO[];
  onClose: () => void;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const artistTracks = useMemo(
    () => artist.trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track): track is TrackDTO => Boolean(track)),
    [artist, tracks],
  );
  const [selectedTrackId, setSelectedTrackId] = useState(artistTracks[0]?.id ?? "");
  const selectedTrack = artistTracks.find((track) => track.id === selectedTrackId) ?? artistTracks[0];
  const memories = useMemories(selectedTrack?.id ?? "", Boolean(selectedTrack?.id));
  const genreNames = useMemo(() => {
    const nodeById = new Map(allNodes.map((node) => [node.id, node]));
    return edges
      .filter((edge) => edge.kind === "genre-artist" && edge.target === artist.id)
      .map((edge) => nodeById.get(edge.source))
      .filter((node): node is Extract<GalaxyNodeDTO, { kind: "genre" }> => node?.kind === "genre")
      .map((node) => node.label)
      .sort();
  }, [allNodes, artist.id, edges]);

  useEffect(() => {
    asideRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const memoryItems = memories.data?.pages.flatMap((page) => page.memories) ?? [];

  return (
    <aside
      ref={asideRef}
      tabIndex={-1}
      aria-labelledby="galaxy-artist-title"
      className="glass absolute inset-x-2 bottom-2 z-10 max-h-[72%] overflow-y-auto rounded-lg p-4 outline-none sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-[min(390px,calc(100%-24px))] sm:max-h-none sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-space-3">
          {artist.imageUrl ? (
            <Image src={artist.imageUrl} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-aurora-cyan"><Music className="size-5" aria-hidden /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="galaxy-artist-title" className="font-display text-2xl font-semibold tracking-tight text-star">
            {artist.label}
          </h2>
          <p className="text-sm text-stardust">
            {artist.weight} saved {artist.weight === 1 ? "track" : "tracks"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${artist.label} details`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-stardust hover:bg-space-3 hover:text-star"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <section className="mt-5" aria-labelledby="artist-genres-heading">
        <h3 id="artist-genres-heading" className="text-sm font-medium text-star">Connected genres</h3>
        {genreNames.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {genreNames.map((genre) => <li key={genre} className="rounded-full bg-space-3 px-3 py-1 text-xs text-stardust">{genre}</li>)}
          </ul>
        ) : <p className="mt-1 text-sm text-stardust">No genre links yet.</p>}
      </section>

      <section className="mt-5" aria-labelledby="artist-tracks-heading">
        <h3 id="artist-tracks-heading" className="text-sm font-medium text-star">Saved tracks</h3>
        <div className="mt-2 space-y-2">
          {artistTracks.map((track) => {
            const selected = track.id === selectedTrack?.id;
            return (
              <div key={track.id} className={cn("rounded-md bg-space-1/75 p-2", selected && "ring-1 ring-aurora-cyan/60")}>
                <button
                  type="button"
                  onClick={() => setSelectedTrackId(track.id!)}
                  aria-pressed={selected}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-1 text-left"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-space-3">
                    {track.albumImageUrl ? <Image src={track.albumImageUrl} alt="" fill sizes="40px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-faint"><Music className="size-4" aria-hidden /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-star">{track.title}</span>
                    <span className="block truncate text-xs text-stardust">{track.albumName ?? artist.label}</span>
                  </span>
                  <span className="text-xs text-stardust">{selected ? "Selected" : "View memories"}</span>
                </button>
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1">
                  <InlinePreview track={track} />
                  <Link href={`/track/${track.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-stardust hover:bg-space-3 hover:text-star">
                    Track details <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedTrack && (
        <section className="mt-5" aria-labelledby="track-memories-heading">
          <h3 id="track-memories-heading" className="text-sm font-medium text-star">
            Memories for {selectedTrack.title}
          </h3>
          {memories.isLoading ? (
            <div className="mt-2 space-y-2" role="status" aria-label="Loading memories">
              <div className="h-16 animate-pulse rounded-md bg-space-3 motion-reduce:animate-none" />
            </div>
          ) : memories.isError ? (
            <button type="button" onClick={() => memories.refetch()} className="mt-2 min-h-11 text-sm text-aurora-cyan">Retry memories</button>
          ) : memoryItems.length === 0 ? (
            <p className="mt-2 text-sm text-stardust">No memories attached to this track yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {memoryItems.map((memory) => (
                <li key={memory.id} className="rounded-md bg-space-1/70 p-3">
                  <p className="line-clamp-4 text-sm text-star">{memory.content}</p>
                  <p className="mt-2 text-xs text-stardust">
                    {memory.mood ? `${MOOD_LABEL[memory.mood]} · ` : ""}{formatRelativeTime(memory.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/track/${selectedTrack.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-aurora-cyan">
            Manage memories on track page
          </Link>
        </section>
      )}
    </aside>
  );
}
