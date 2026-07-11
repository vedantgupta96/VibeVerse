"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ArtistInspector } from "@/components/galaxy/ArtistInspector";
import { ArtistNavigator } from "@/components/galaxy/ArtistNavigator";
import { GalaxyEmptyState } from "@/components/galaxy/GalaxyEmptyState";
import { GalaxySkeleton } from "@/components/galaxy/GalaxySkeleton";
import { Button } from "@/components/ui/button";
import { useGalaxy } from "@/hooks/useGalaxy";

const GalaxyCanvas = dynamic(
  () => import("@/components/galaxy/GalaxyCanvas").then((module) => module.GalaxyCanvas),
  { ssr: false, loading: () => <div className="min-h-[480px] rounded-lg bg-space-1" /> },
);

export function GalaxyExperience() {
  const galaxy = useGalaxy();
  const [chooserValue, setChooserValue] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const artists = useMemo(
    () =>
      (galaxy.data?.nodes.filter((node) => node.kind === "artist") ?? []).sort(
        (a, b) => a.label.localeCompare(b.label),
      ),
    [galaxy.data],
  );
  const handleCanvasSelect = useCallback((id: string) => {
    setChooserValue(id);
    setSelectedArtistId(id);
  }, []);
  const handleCloseInspector = useCallback(() => {
    setSelectedArtistId(null);
    requestAnimationFrame(() => openButtonRef.current?.focus());
  }, []);

  if (galaxy.isLoading) return <GalaxySkeleton />;
  if (galaxy.isError) {
    return (
      <section className="flex min-h-[480px] flex-col items-center justify-center text-center">
        <h1 className="font-display text-3xl font-semibold">The chart went dark</h1>
        <p className="mt-3 max-w-md text-stardust">
          We couldn’t load your music galaxy. Your library is still safe.
        </p>
        <Button className="mt-6 min-h-11" onClick={() => galaxy.refetch()} disabled={galaxy.isFetching}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      </section>
    );
  }
  if (!galaxy.data || artists.length === 0) return <GalaxyEmptyState />;

  const selectedArtist = selectedArtistId
    ? artists.find((artist) => artist.id === selectedArtistId) ?? null
    : null;
  const genreCount = galaxy.data.nodes.length - artists.length;
  const sharedCount = galaxy.data.edges.filter((edge) => edge.kind === "shared-genre").length;

  return (
    <section className="space-y-5">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Music Galaxy</h1>
        <p className="mt-2 text-stardust">
          Your saved artists form the planets. Genre rings reveal the gravity they share.
        </p>
        <p className="sr-only">
          This galaxy contains {artists.length} artists, {genreCount} genre hubs, and {sharedCount} artist relationships.
        </p>
      </header>

      <ArtistNavigator
        artists={artists}
        value={chooserValue}
        onChange={setChooserValue}
        onOpen={() => setSelectedArtistId(chooserValue)}
        openButtonRef={openButtonRef}
      />

      <div className="relative overflow-hidden rounded-lg border border-border bg-space-1">
        <GalaxyCanvas
          nodes={galaxy.data.nodes}
          edges={galaxy.data.edges}
          selectedArtistId={selectedArtistId}
          onSelectArtist={handleCanvasSelect}
        />
        {selectedArtist && (
          <ArtistInspector
            key={selectedArtist.id}
            artist={selectedArtist}
            allNodes={galaxy.data.nodes}
            edges={galaxy.data.edges}
            tracks={galaxy.data.tracks}
            onClose={handleCloseInspector}
          />
        )}
      </div>
    </section>
  );
}
