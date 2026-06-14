import Image from "next/image";
import { User } from "lucide-react";
import type { ArtistResultDTO } from "@/lib/dto";

export function ArtistCard({ artist }: { artist: ArtistResultDTO }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-space-2 p-5 text-center transition-colors hover:bg-space-3">
      <div className="relative size-24 overflow-hidden rounded-full bg-space-3">
        {artist.imageUrl ? (
          <Image
            src={artist.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-faint">
            <User className="size-8" aria-hidden />
          </div>
        )}
      </div>
      <p className="line-clamp-1 text-sm font-medium text-star">
        {artist.name}
      </p>
      {artist.genres.length > 0 && (
        <p className="line-clamp-1 text-xs text-stardust">
          {artist.genres.slice(0, 2).join(" · ")}
        </p>
      )}
    </div>
  );
}
