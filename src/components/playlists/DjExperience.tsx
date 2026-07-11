"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Sparkles, WandSparkles } from "lucide-react";
import { GenerationProgress } from "@/components/playlists/GenerationProgress";
import { PlaylistCard } from "@/components/playlists/PlaylistCard";
import { Button } from "@/components/ui/button";
import { useGeneratePlaylist, usePlaylists } from "@/hooks/usePlaylists";
import { ApiClientError } from "@/lib/api-client";
import { generatePlaylistSchema } from "@/lib/schemas/playlist";

const EXAMPLES = [
  "late-night coding in Chicago during winter",
  "sunlit Sunday cooking with old friends",
  "a slow train home after a life-changing week",
] as const;

function generationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "The transmission dropped. Check your connection and try again.";
  }
  if (error.code === "AI_UNAVAILABLE") {
    return "The AI DJ is off-air right now. Try this signal again in a moment.";
  }
  if (error.code === "AI_REFUSED") {
    return "The AI DJ couldn’t build from that request. Try describing a setting, mood, or moment instead.";
  }
  if (error.code === "PROVIDER_UNAVAILABLE") {
    return "The music catalog didn’t answer. Your prompt is safe—try again in a moment.";
  }
  return error.message;
}

export function DjExperience() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const generation = useGeneratePlaylist();
  const history = usePlaylists();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = generatePlaylistSchema.safeParse({ prompt });
    if (!parsed.success) {
      setFieldError("Describe your vibe in 3–300 characters.");
      return;
    }
    setFieldError(null);
    generation.mutate(parsed.data.prompt, {
      onSuccess: ({ playlist }) => router.push(`/playlist/${playlist.id}`),
    });
  }

  if (generation.isPending) {
    return <GenerationProgress prompt={prompt.trim()} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden border-b border-border pb-12 pt-5 sm:pb-16 sm:pt-10">
        <div
          className="pointer-events-none absolute -left-32 -top-48 size-[34rem] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,.2), transparent 68%)",
          }}
          aria-hidden
        />
        <div className="relative grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.72fr)]">
          <div>
            <div className="mb-5 flex items-center gap-2 text-sm text-aurora-cyan">
              <Radio className="size-4" aria-hidden />
              Vibe transmission
            </div>
            <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl lg:text-6xl">
              Send a feeling. Get a world of records.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-stardust">
              Describe a place, a memory, or the exact energy you need. Your AI DJ
              reads the music you’ve saved, then reaches beyond it.
            </p>
          </div>

          <div className="hidden justify-end lg:flex" aria-hidden>
            <div className="relative size-48 rounded-full border border-aurora-violet/25">
              <div className="absolute inset-8 rounded-full border border-aurora-cyan/15" />
              <div className="absolute left-[22%] top-[48%] size-2 rounded-full bg-aurora-cyan shadow-[0_0_12px_rgba(34,211,238,.7)]" />
              <div className="absolute left-[55%] top-[25%] size-1.5 rounded-full bg-star" />
              <div className="absolute left-[69%] top-[61%] size-2 rounded-full bg-aurora-magenta shadow-[0_0_10px_rgba(225,78,207,.6)]" />
              <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aurora-violet/20 blur-lg" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-14">
        <form onSubmit={submit} className="min-w-0">
          <label htmlFor="vibe-prompt" className="font-display text-xl font-medium">
            What should this playlist feel like?
          </label>
          <p id="prompt-help" className="mt-2 max-w-xl text-sm leading-6 text-stardust">
            A specific scene gives the DJ more to work with than a genre alone.
          </p>
          <textarea
            id="vibe-prompt"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              if (fieldError) setFieldError(null);
              if (generation.isError) generation.reset();
            }}
            onBlur={() => {
              if (prompt.length > 0 && !generatePlaylistSchema.safeParse({ prompt }).success) {
                setFieldError("Describe your vibe in 3–300 characters.");
              }
            }}
            maxLength={300}
            rows={5}
            placeholder="Late-night coding in Chicago during winter…"
            aria-describedby={`prompt-help${fieldError ? " prompt-error" : ""}`}
            aria-invalid={Boolean(fieldError)}
            className="mt-5 w-full resize-none rounded-lg border border-border bg-space-1/80 px-5 py-4 text-base leading-7 text-star outline-none transition-colors placeholder:text-stardust focus:border-aurora-violet/70"
          />
          <div className="mt-2 flex min-h-5 items-start justify-between gap-4">
            <p id="prompt-error" className="text-xs text-danger" aria-live="polite">
              {fieldError ?? ""}
            </p>
            <span className="shrink-0 font-mono text-[11px] text-faint">
              {prompt.length}/300
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Example prompts">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPrompt(example);
                  setFieldError(null);
                  generation.reset();
                }}
                className="min-h-11 rounded-full border border-border px-4 py-2 text-left text-xs leading-5 text-stardust transition-colors hover:border-aurora-violet/50 hover:bg-space-2 hover:text-star"
              >
                {example}
              </button>
            ))}
          </div>

          {generation.isError ? (
            <div
              className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm leading-6 text-star"
              role="alert"
            >
              {generationErrorMessage(generation.error)}
            </div>
          ) : null}

          <Button type="submit" className="mt-7 min-h-12 px-7" disabled={!prompt.trim()}>
            <WandSparkles className="size-4" aria-hidden />
            Generate playlist
          </Button>
        </form>

        <aside className="border-t border-border pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-2 text-sm text-star">
            <Sparkles className="size-4 text-aurora-magenta" aria-hidden />
            What the DJ hears
          </div>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-stardust">
            <li>Your scene, pace, and emotional temperature</li>
            <li>Artists and genres already in your library</li>
            <li>Relevant moments from your music journal</li>
          </ul>
          <p className="mt-5 text-xs leading-5 text-faint">
            Your memories guide this playlist only. VibeVerse doesn’t put their text
            into the playlist.
          </p>
        </aside>
      </section>

      <section className="border-t border-border py-10 sm:py-14" aria-labelledby="history-title">
        <h2 id="history-title" className="font-display text-2xl font-semibold">
          Previous transmissions
        </h2>
        {history.isLoading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-stardust">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Tuning your history…
          </div>
        ) : history.isError ? (
          <p className="py-10 text-sm text-stardust">
            Your playlist history couldn’t be reached. Refresh this page to try again.
          </p>
        ) : (history.data?.playlists.length ?? 0) > 0 ? (
          <div className="mt-4">
            {history.data!.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-star">No transmissions yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stardust">
              Your generated playlists will collect here. Start with a moment you want
              to stay inside a little longer.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
