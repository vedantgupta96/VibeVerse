"use client";

import { useState } from "react";
import { Loader2, SearchX, TriangleAlert } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { TrackCard } from "@/components/tracks/TrackCard";
import { ArtistCard } from "@/components/tracks/ArtistCard";
import { useSearch } from "@/hooks/useSearch";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SearchType } from "@/lib/schemas/search";

const TABS: { value: SearchType; label: string }[] = [
  { value: "track", label: "Tracks" },
  { value: "artist", label: "Artists" },
];

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<SearchType>("track");

  const { data, isLoading, isError, error, isFetching } = useSearch(query, tab);
  const hasQuery = query.trim().length >= 1;

  return (
    <div className="mx-auto max-w-3xl">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search for a song or artist…"
        size="hero"
        autoFocus
      />

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              tab === t.value
                ? "bg-space-3 text-star"
                : "text-stardust hover:text-star",
            )}
          >
            {t.label}
          </button>
        ))}
        {isFetching && hasQuery && (
          <Loader2 className="ml-1 size-4 animate-spin self-center text-faint" />
        )}
      </div>

      <div className="mt-6">
        {!hasQuery ? (
          <StateMessage
            icon={<SearchX className="size-6" />}
            title="Find your next favorite"
            note="Search across millions of tracks and artists."
          />
        ) : isError ? (
          <StateMessage
            icon={<TriangleAlert className="size-6 text-danger" />}
            title="Couldn’t reach the music library"
            note={
              error instanceof ApiClientError &&
              error.code === "PROVIDER_UNAVAILABLE"
                ? "The provider is unavailable right now. Try again in a moment."
                : "Something went wrong. Try again."
            }
          />
        ) : isLoading ? (
          <StateMessage
            icon={<Loader2 className="size-6 animate-spin" />}
            title="Searching…"
          />
        ) : tab === "track" ? (
          (data?.tracks ?? []).length > 0 ? (
            <div className="flex flex-col gap-1">
              {data!.tracks!.map((t) => (
                <TrackCard key={t.providerId} track={t} />
              ))}
            </div>
          ) : (
            <NoResults query={query} />
          )
        ) : (data?.artists ?? []).length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data!.artists!.map((a) => (
              <ArtistCard key={a.providerId} artist={a} />
            ))}
          </div>
        ) : (
          <NoResults query={query} />
        )}
      </div>
    </div>
  );
}

function StateMessage({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center text-stardust">
      <span className="text-faint">{icon}</span>
      <p className="text-sm text-star">{title}</p>
      {note && <p className="max-w-xs text-xs text-stardust">{note}</p>}
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <StateMessage
      icon={<SearchX className="size-6" />}
      title={`No results for “${query.trim()}”`}
      note="Try a different spelling or another artist."
    />
  );
}
