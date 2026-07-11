"use client";

import { useState } from "react";
import { BookHeart, Loader2, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { Button } from "@/components/ui/button";
import { useMemories, useMemorySearch } from "@/hooks/useMemories";
import { ApiClientError } from "@/lib/api-client";

export function JournalFeed() {
  const [query, setQuery] = useState("");
  const searching = query.trim().length >= 1;

  const feed = useMemories();
  const search = useMemorySearch(query);

  const feedItems = feed.data?.pages.flatMap((p) => p.memories) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SearchBar
          value={query}
          onChange={setQuery}
          size="hero"
          placeholder="Search your memories by feeling…"
        />
        {searching && (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-faint">
            <Sparkles className="size-3.5" aria-hidden />
            Semantic search — finds memories by meaning, not just keywords.
          </p>
        )}
      </div>

      {searching ? (
        search.isLoading ? (
          <Centered>
            <Loader2 className="size-6 animate-spin" />
          </Centered>
        ) : search.isError ? (
          <Message
            title="Semantic search is unavailable"
            note={
              search.error instanceof ApiClientError &&
              search.error.code === "AI_UNAVAILABLE"
                ? "The embedding service isn’t configured yet. Memories still save and appear in your feed."
                : "Something went wrong. Try again."
            }
          />
        ) : (search.data?.memories.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-3">
            {search.data!.memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} showTrack />
            ))}
          </div>
        ) : (
          <Message
            title="No matching memories"
            note="Try describing the feeling or moment differently."
          />
        )
      ) : feed.isLoading ? (
        <Centered>
          <Loader2 className="size-6 animate-spin" />
        </Centered>
      ) : feedItems.length === 0 ? (
        <Message
          icon={<BookHeart className="size-6" />}
          title="Your journal is empty"
          note="Open a track and write what it brings back — your memories gather here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {feedItems.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} showTrack />
          ))}
          {feed.hasNextPage && (
            <Button
              variant="outline"
              onClick={() => feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
              className="self-center"
            >
              {feed.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-16 text-faint">{children}</div>;
}

function Message({
  icon,
  title,
  note,
}: {
  icon?: React.ReactNode;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      {icon && <span className="text-faint">{icon}</span>}
      <p className="text-sm text-star">{title}</p>
      {note && <p className="max-w-sm text-xs text-stardust">{note}</p>}
    </div>
  );
}
