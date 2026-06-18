"use client";

import { useState } from "react";
import { MoodPicker } from "@/components/memories/MoodPicker";
import { Button } from "@/components/ui/button";
import { useCreateMemory } from "@/hooks/useMemories";
import type { Mood } from "@/lib/moods";

export function MemoryEditor({ trackId }: { trackId: string }) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const create = useCreateMemory();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ trackId, content: trimmed, mood });
      setContent("");
      setMood(null);
    } catch {
      // surfaced below
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-space-2 p-4"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What does this song bring back?"
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-md border border-border bg-space-1/60 px-3.5 py-2.5 text-sm text-star outline-none transition-colors placeholder:text-faint focus:border-aurora-violet/60"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MoodPicker value={mood} onChange={setMood} />
        <Button
          type="submit"
          disabled={create.isPending || !content.trim()}
          className="shrink-0"
        >
          {create.isPending ? "Saving…" : "Remember this"}
        </Button>
      </div>
      {create.isError && (
        <p className="text-xs text-danger">
          Couldn’t save your memory. Please try again.
        </p>
      )}
    </form>
  );
}
