import { headers } from "next/headers";
import { auth } from "@/server/auth";

export const metadata = { title: "Home · VibeVerse" };

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const firstName = session?.user.name?.split(" ")[0] ?? "traveler";

  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-64"
        style={{
          background:
            "radial-gradient(500px at 20% 0%, rgba(225, 78, 207, 0.12), transparent 70%)",
        }}
      />
      <div className="relative">
        <p className="font-mono text-xs tracking-wider text-faint uppercase">
          Your universe
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-3 max-w-md text-stardust">
          Search lands next — soon you’ll save tracks, write memories, and
          generate playlists from a single vibe.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Search & save", note: "Build your library" },
            { title: "AI DJ", note: "Playlists from a prompt" },
            { title: "Your galaxy", note: "Taste as a living map" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-border bg-space-2 p-5"
            >
              <p className="font-display text-lg">{card.title}</p>
              <p className="mt-1 text-sm text-stardust">{card.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
