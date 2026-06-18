"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music, Pencil, Trash2 } from "lucide-react";
import { MoodPicker } from "@/components/memories/MoodPicker";
import { Button } from "@/components/ui/button";
import { useDeleteMemory, useUpdateMemory } from "@/hooks/useMemories";
import { MOOD_BORDER, MOOD_LABEL, MOOD_TEXT, type Mood } from "@/lib/moods";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { MemoryDTO } from "@/lib/dto";

export function MemoryCard({
  memory,
  showTrack = false,
}: {
  memory: MemoryDTO & { similarity?: number };
  showTrack?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(memory.content);
  const [mood, setMood] = useState<Mood | null>(memory.mood);
  const update = useUpdateMemory();
  const remove = useDeleteMemory();

  async function save() {
    const trimmed = content.trim();
    if (!trimmed) return;
    await update.mutateAsync({ id: memory.id, content: trimmed, mood });
    setEditing(false);
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-border border-l-2 bg-space-2 p-4",
        memory.mood ? MOOD_BORDER[memory.mood] : "border-l-faint",
      )}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-md border border-border bg-space-1/60 px-3 py-2 text-sm text-star outline-none focus:border-aurora-violet/60"
          />
          <MoodPicker value={mood} onChange={setMood} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setContent(memory.content);
                setMood(memory.mood);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap text-star">
            {memory.content}
          </p>

          <div className="mt-3 flex items-center gap-2 text-xs text-faint">
            {memory.mood && (
              <span className={cn("font-medium", MOOD_TEXT[memory.mood])}>
                {MOOD_LABEL[memory.mood]}
              </span>
            )}
            {memory.mood && <span aria-hidden>·</span>}
            <time>{formatRelativeTime(memory.createdAt)}</time>
            {memory.similarity !== undefined && (
              <span className="ml-auto font-mono text-faint">
                {Math.round(memory.similarity * 100)}% match
              </span>
            )}
          </div>

          {showTrack && (
            <Link
              href={memory.track.id ? `/track/${memory.track.id}` : "#"}
              className="mt-3 flex items-center gap-2 rounded-md bg-space-1/60 p-2 transition-colors hover:bg-space-3"
            >
              <span className="relative size-8 shrink-0 overflow-hidden rounded bg-space-3">
                {memory.track.albumImageUrl ? (
                  <Image
                    src={memory.track.albumImageUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-faint">
                    <Music className="size-3.5" aria-hidden />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-star">
                  {memory.track.title}
                </span>
                <span className="block truncate text-xs text-stardust">
                  {memory.track.artist.name}
                </span>
              </span>
            </Link>
          )}

          <div className="mt-3 flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit memory"
              className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-space-3 hover:text-stardust"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => remove.mutate(memory.id)}
              disabled={remove.isPending}
              aria-label="Delete memory"
              className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-space-3 hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </>
      )}
    </article>
  );
}
