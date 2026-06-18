"use client";

import { MOODS, MOOD_BG, MOOD_LABEL, type Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

export function MoodPicker({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MOODS.map((mood) => {
        const active = value === mood;
        return (
          <button
            key={mood}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : mood)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? cn(MOOD_BG[mood], "border-transparent font-medium text-void")
                : "border-border text-stardust hover:text-star",
            )}
          >
            {MOOD_LABEL[mood]}
          </button>
        );
      })}
    </div>
  );
}
