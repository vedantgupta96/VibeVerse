import { JournalFeed } from "@/components/memories/JournalFeed";

export const metadata = { title: "Journal · VibeVerse" };

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight">
        Memory Journal
      </h1>
      <p className="mb-6 text-sm text-stardust">
        Every memory you’ve attached to a song, in one place.
      </p>
      <JournalFeed />
    </div>
  );
}
