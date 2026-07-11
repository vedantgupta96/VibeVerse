"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { TasteProfileView } from "@/components/taste/TasteProfileView";
import { TasteSkeleton } from "@/components/taste/TasteSkeleton";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/hooks/useLibrary";
import { useRefreshTasteProfile, useTasteProfile } from "@/hooks/useTasteProfile";
import { ApiClientError } from "@/lib/api-client";

const REQUIRED_TRACKS = 5;

function refreshErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "The signal dropped. Check your connection and try again.";
  }
  if (error.code === "RATE_LIMITED") {
    const details = error.details as { retryAfterSeconds?: unknown } | undefined;
    const seconds = typeof details?.retryAfterSeconds === "number" ? details.retryAfterSeconds : 120;
    return `Your Taste DNA is still settling. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
  }
  if (error.code === "AI_UNAVAILABLE") {
    return "Taste DNA is off-air right now. Your library is safe—try again in a moment.";
  }
  if (error.code === "AI_REFUSED") {
    return "Taste DNA couldn’t form from this library yet. Add a little more music or try again later.";
  }
  if (error.code === "VALIDATION_ERROR") {
    return "Save at least five tracks before revealing your Taste DNA.";
  }
  return error.message;
}

function TasteOnboarding({ savedCount, eligible, onReveal, pending, error }: {
  savedCount: number;
  eligible: boolean;
  onReveal: () => void;
  pending: boolean;
  error: unknown;
}) {
  return (
    <section className="mx-auto max-w-3xl py-10 sm:py-16" aria-labelledby="taste-onboarding-title">
      <div className="flex size-14 items-center justify-center rounded-full bg-aurora-violet/15 text-aurora-cyan">
        <Sparkles className="size-6" aria-hidden />
      </div>
      <h1 id="taste-onboarding-title" className="mt-7 text-balance font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl">
        {eligible ? "Your listening fingerprint is ready." : "Give your Taste DNA a signal to read."}
      </h1>
      <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-stardust">
        {eligible
          ? "VibeVerse can now trace the artists, genres, and memories that shape your musical world."
          : "Five saved tracks give the profile enough range to find a pattern without pretending one song tells the whole story."}
      </p>

      <div className="mt-10 border-y border-border py-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-star">Music saved</span>
          <span className="font-mono text-sm text-stardust">{Math.min(savedCount, REQUIRED_TRACKS)} / {REQUIRED_TRACKS}</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2" aria-label={`${Math.min(savedCount, REQUIRED_TRACKS)} of ${REQUIRED_TRACKS} tracks saved`}>
          {Array.from({ length: REQUIRED_TRACKS }, (_, index) => (
            <span key={index} className={`h-2 rounded-full ${index < savedCount ? "bg-aurora-violet" : "bg-space-3"}`} aria-hidden />
          ))}
        </div>
      </div>

      {error ? <p className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm leading-6 text-star" role="alert">{refreshErrorMessage(error)}</p> : null}
      <p className="sr-only" aria-live="polite">{pending ? "Reading your library to create Taste DNA." : ""}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {eligible ? (
          <Button onClick={onReveal} disabled={pending} className="min-h-12 px-6">
            <Sparkles className="size-4" aria-hidden />
            {pending ? "Reading your library…" : "Reveal my Taste DNA"}
          </Button>
        ) : (
          <Link href="/search" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full gradient-aurora px-6 text-sm font-medium text-void transition-transform hover:scale-[1.02] active:scale-100">
            Find music <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <Link href="/library" className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-6 text-sm text-star transition-colors hover:bg-space-3">
          Open library
        </Link>
      </div>
    </section>
  );
}

export function TasteExperience() {
  const profileQuery = useTasteProfile();
  const libraryQuery = useLibrary();
  const refresh = useRefreshTasteProfile();
  const firstLibraryPage = libraryQuery.data?.pages[0];
  const savedCount = Math.min(firstLibraryPage?.tracks.length ?? 0, REQUIRED_TRACKS);
  const hasLibraryData = Boolean(firstLibraryPage);
  const eligible = savedCount >= REQUIRED_TRACKS;
  const profile = profileQuery.data?.profile ?? null;

  if (profileQuery.isLoading || (!profile && libraryQuery.isLoading)) return <TasteSkeleton />;

  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl py-16">
        <h1 className="font-display text-4xl font-semibold tracking-[-.03em]">Taste DNA is out of reach.</h1>
        <p className="mt-4 text-base leading-7 text-stardust">We couldn’t retrieve your profile. Your saved music hasn’t gone anywhere.</p>
        <Button variant="outline" className="mt-7 min-h-11" onClick={() => void profileQuery.refetch()}>Try again</Button>
      </section>
    );
  }

  if (!profile && libraryQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl py-16">
        <h1 className="font-display text-4xl font-semibold tracking-[-.03em]">Your library signal is faint.</h1>
        <p className="mt-4 text-base leading-7 text-stardust">We need your current saved-track count before revealing Taste DNA.</p>
        <Button variant="outline" className="mt-7 min-h-11" onClick={() => void libraryQuery.refetch()}>Try again</Button>
      </section>
    );
  }

  if (!profile) {
    return <TasteOnboarding savedCount={savedCount} eligible={eligible} onReveal={() => refresh.mutate()} pending={refresh.isPending} error={refresh.error} />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-stardust">Your listening fingerprint, drawn from saved music and memories.</p>
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending || (hasLibraryData && !eligible)} className="min-h-11">
          <RefreshCw className={`size-4 ${refresh.isPending ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
          {refresh.isPending ? "Refreshing…" : "Refresh Taste DNA"}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-0">
        {refresh.isError ? <p className="mb-7 rounded-md bg-danger/10 px-4 py-3 text-sm leading-6 text-star" role="alert">{refreshErrorMessage(refresh.error)}</p> : null}
        {refresh.isPending ? <p className="sr-only">Refreshing Taste DNA.</p> : null}
        {refresh.isSuccess ? <p className="sr-only">Taste DNA refreshed.</p> : null}
        {hasLibraryData && !eligible ? <p className="mb-7 text-sm leading-6 text-stardust">Save {REQUIRED_TRACKS - savedCount} more track{REQUIRED_TRACKS - savedCount === 1 ? "" : "s"} before refreshing this profile.</p> : null}
      </div>

      <TasteProfileView profile={profile} refreshing={refresh.isPending} />
    </div>
  );
}
