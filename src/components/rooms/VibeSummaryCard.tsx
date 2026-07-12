"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenerateVibe } from "@/hooks/useRoom";
import { ApiClientError } from "@/lib/api-client";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { RoomSnapshotDTO } from "@/lib/dto";

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "Couldn't read the room. Try again.";
  }
  if (error.code === "RATE_LIMITED") {
    const details = error.details as { retryAfterSeconds?: unknown } | undefined;
    const seconds =
      typeof details?.retryAfterSeconds === "number" ? details.retryAfterSeconds : 60;
    return `This room's vibe was just read — try again in ${seconds}s.`;
  }
  if (error.code === "AI_UNAVAILABLE") {
    return "The AI DJ is off-air right now.";
  }
  if (error.code === "AI_REFUSED") {
    return "Couldn't form a read from this room yet.";
  }
  return error.message;
}

export function VibeSummaryCard({ room }: { room: RoomSnapshotDTO }) {
  const generate = useGenerateVibe(room.id);

  return (
    <section className="glass rounded-lg p-5" aria-labelledby="vibe-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="vibe-title"
          className="text-xs font-medium uppercase tracking-wide text-stardust"
        >
          Read the room
        </h2>
        <Button
          variant="ghost"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="min-h-8 px-2 text-xs"
          aria-label="Ask the AI DJ to read this room"
        >
          <Sparkles
            className={cn("size-3.5", generate.isPending && "animate-pulse")}
            aria-hidden
          />
        </Button>
      </div>

      {room.vibeSummary ? (
        <>
          <p className="mt-3 text-sm leading-6 text-star">{room.vibeSummary}</p>
          {room.vibeSummaryAt && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              {formatRelativeTime(room.vibeSummaryAt)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stardust">
          Ask the AI DJ for a quick read of who&apos;s here and what&apos;s playing.
        </p>
      )}

      {generate.isError && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {errorMessage(generate.error)}
        </p>
      )}
    </section>
  );
}
