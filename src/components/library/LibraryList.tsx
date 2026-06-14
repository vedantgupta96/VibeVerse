"use client";

import Link from "next/link";
import { Disc3, Loader2 } from "lucide-react";
import { TrackCard } from "@/components/tracks/TrackCard";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/hooks/useLibrary";

export function LibraryList() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLibrary();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-faint">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-20 text-center text-sm text-danger">
        Couldn’t load your library. Try refreshing.
      </p>
    );
  }

  const tracks = data?.pages.flatMap((p) => p.tracks) ?? [];

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Disc3 className="size-8 text-faint" aria-hidden />
        <p className="text-sm text-star">Your universe is empty</p>
        <p className="max-w-xs text-xs text-stardust">
          Save tracks you love and they’ll gather here — the seed of your
          galaxy.
        </p>
        <Link href="/search" className="mt-2">
          <Button>Find music</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track) => (
        <TrackCard key={track.id ?? track.providerId} track={track} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
