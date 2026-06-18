import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Music } from "lucide-react";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getTrackById } from "@/server/services/library";
import { TrackDetailActions } from "@/components/tracks/TrackDetailActions";
import { TrackMemories } from "@/components/memories/TrackMemories";
import { formatDuration } from "@/lib/utils";

export const metadata = { title: "Track · VibeVerse" };

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) notFound(); // layout guards, but narrow the type
  const track = await getTrackById(session.user.id, id);
  if (!track) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative size-44 shrink-0 overflow-hidden rounded-lg bg-space-3 shadow-[var(--shadow-ambient)]">
          {track.albumImageUrl ? (
            <Image
              src={track.albumImageUrl}
              alt=""
              fill
              sizes="176px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-faint">
              <Music className="size-10" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-mono text-xs tracking-wider text-faint uppercase">
            Track
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {track.title}
          </h1>
          <p className="mt-1 text-stardust">{track.artist.name}</p>
          <p className="mt-1 text-sm text-faint">
            {[track.albumName, formatDuration(track.durationMs)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-5">
            <TrackDetailActions track={track} />
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-medium">Memories</h2>
        <TrackMemories trackId={track.id!} />
      </section>
    </div>
  );
}
