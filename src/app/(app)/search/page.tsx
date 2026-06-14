import { Suspense } from "react";
import { SearchExperience } from "@/components/search/SearchExperience";

export const metadata = { title: "Search · VibeVerse" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">
        Search
      </h1>
      <Suspense>
        <SearchExperience initialQuery={q ?? ""} />
      </Suspense>
    </div>
  );
}
