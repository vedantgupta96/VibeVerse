import type { GalaxyArtistNodeDTO } from "@/lib/dto";
import { Button } from "@/components/ui/button";
import type { RefObject } from "react";

export function ArtistNavigator({
  artists,
  value,
  onChange,
  onOpen,
  openButtonRef,
}: {
  artists: GalaxyArtistNodeDTO[];
  value: string;
  onChange: (id: string) => void;
  onOpen: () => void;
  openButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="galaxy-artist" className="mb-1.5 block text-sm font-medium text-star">
          Explore an artist
        </label>
        <select
          id="galaxy-artist"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-md border border-border bg-space-1 px-3 text-base text-star sm:text-sm"
        >
          <option value="">Choose an artist</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.label} · {artist.weight} saved {artist.weight === 1 ? "track" : "tracks"}
            </option>
          ))}
        </select>
      </div>
      <Button
        ref={openButtonRef}
        variant="outline"
        className="min-h-11 shrink-0"
        disabled={!value}
        onClick={onOpen}
      >
        Open artist
      </Button>
    </div>
  );
}
