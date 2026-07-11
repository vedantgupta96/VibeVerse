"use client";

import { Loader2 } from "lucide-react";
import { MemoryEditor } from "@/components/memories/MemoryEditor";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { Button } from "@/components/ui/button";
import { useMemories } from "@/hooks/useMemories";

export function TrackMemories({ trackId }: { trackId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMemories(trackId);
  const memories = data?.pages.flatMap((p) => p.memories) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <MemoryEditor trackId={trackId} />

      {isLoading ? (
        <div className="flex justify-center py-8 text-faint">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : memories.length === 0 ? (
        <p className="py-4 text-sm text-stardust">
          No memories yet — attach the first one above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
          {hasNextPage && (
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="self-center"
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
