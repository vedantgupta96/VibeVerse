import Image from "next/image";
import { UserRound } from "lucide-react";
import { TasteDnaOrb } from "@/components/taste/TasteDnaOrb";
import type { TasteProfileDTO } from "@/lib/dto";
import { MOOD_BG, MOOD_LABEL } from "@/lib/moods";

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TasteProfileView({
  profile,
  refreshing = false,
}: {
  profile: TasteProfileDTO;
  refreshing?: boolean;
}) {
  const maxGenreCount = Math.max(...profile.topGenres.map((genre) => genre.count), 1);
  const totalMoods = profile.moodDistribution.reduce((total, item) => total + item.count, 0);

  return (
    <div>
      <section className="grid items-center gap-8 border-b border-border pb-12 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1fr)] lg:gap-16">
        <TasteDnaOrb
          archetype={profile.listenerArchetype}
          moods={profile.moodDistribution}
          refreshing={refreshing}
        />
        <div className="max-w-2xl">
          <h1 className="text-balance font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl">
            {profile.listenerArchetype}
          </h1>
          <p className="mt-5 text-pretty text-base leading-8 text-stardust">
            {profile.summary}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2" aria-label="Listening traits">
            {profile.traits.map((trait) => (
              <li key={trait} className="rounded-full border border-border bg-space-1 px-4 py-2 text-sm text-star">
                {trait}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-x-14 gap-y-12 py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,.72fr)]">
        <section aria-labelledby="genres-heading">
          <h2 id="genres-heading" className="font-display text-2xl font-semibold">Genres in your orbit</h2>
          <p className="mt-2 text-sm leading-6 text-stardust">Each bar reflects saved tracks whose artist carries that genre.</p>
          {profile.topGenres.length > 0 ? (
            <ol className="mt-7 space-y-5">
              {profile.topGenres.map((genre) => {
                const percentage = (genre.count / maxGenreCount) * 100;
                return (
                  <li key={genre.name}>
                    <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-medium text-star">{genre.name}</span>
                      <span className="font-mono text-xs text-stardust">{genre.count} saved</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-space-3" aria-hidden>
                      <div className="h-full rounded-full bg-aurora-violet" style={{ width: `${percentage}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-7 text-sm leading-6 text-stardust">Your saved artists do not have genre metadata yet.</p>
          )}
        </section>

        <section aria-labelledby="moods-heading" className="lg:border-l lg:border-border lg:pl-10">
          <h2 id="moods-heading" className="font-display text-2xl font-semibold">Memory weather</h2>
          <p className="mt-2 text-sm leading-6 text-stardust">Moods you chose in your music journal.</p>
          {profile.moodDistribution.length > 0 ? (
            <ul className="mt-7 space-y-4">
              {profile.moodDistribution.map((item) => {
                const percent = totalMoods > 0 ? Math.round((item.count / totalMoods) * 100) : 0;
                return (
                  <li key={item.mood} className="flex min-h-11 items-center gap-3">
                    <span className={`size-3 shrink-0 rounded-full ${MOOD_BG[item.mood]}`} aria-hidden />
                    <span className="flex-1 text-sm text-star">{MOOD_LABEL[item.mood]}</span>
                    <span className="font-mono text-xs text-stardust">{item.count} · {percent}%</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-7 text-sm leading-6 text-stardust">Add moods to journal memories and their colors will gather here.</p>
          )}
        </section>
      </div>

      <section className="border-t border-border py-12" aria-labelledby="artists-heading">
        <h2 id="artists-heading" className="font-display text-2xl font-semibold">Artists at the center</h2>
        <p className="mt-2 text-sm leading-6 text-stardust">The voices with the strongest presence in your saved music.</p>
        <ol className="mt-7 flex gap-6 overflow-x-auto pb-3">
          {profile.topArtists.map((artist) => (
            <li key={artist.id} className="w-28 shrink-0">
              <div className="relative size-24 overflow-hidden rounded-full bg-space-3">
                {artist.imageUrl ? (
                  <Image src={artist.imageUrl} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-faint"><UserRound className="size-7" aria-hidden /></div>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-star">{artist.name}</p>
              <p className="mt-1 font-mono text-xs text-stardust">{artist.count} saved</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="border-t border-border pt-6 font-mono text-xs text-faint">
        Generated {DATE_FORMAT.format(new Date(profile.generatedAt))}
      </p>
    </div>
  );
}
