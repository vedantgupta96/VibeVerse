"use client";

import { useState } from "react";
import { MOOD_BG, MOOD_LABEL, MOODS } from "@/lib/moods";
import { useReact } from "@/hooks/useRoom";
import { ApiClientError } from "@/lib/api-client";

export function ReactionBar({ roomId }: { roomId: string }) {
  const react = useReact(roomId);
  const [notice, setNotice] = useState<string | null>(null);

  function send(mood: (typeof MOODS)[number]) {
    react.mutate(mood, {
      onError: (error) => {
        if (error instanceof ApiClientError && error.code === "RATE_LIMITED") {
          setNotice("Slow down a moment before reacting again.");
          setTimeout(() => setNotice(null), 3000);
        }
      },
    });
  }

  return (
    <section aria-label="React to this room" className="glass rounded-lg p-4">
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => send(mood)}
            className="flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs text-stardust transition-colors hover:bg-space-3 hover:text-star"
          >
            <span className={`size-2 rounded-full ${MOOD_BG[mood]}`} aria-hidden />
            {MOOD_LABEL[mood]}
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-4 text-xs text-stardust" role="status" aria-live="polite">
        {notice ?? ""}
      </p>
    </section>
  );
}
