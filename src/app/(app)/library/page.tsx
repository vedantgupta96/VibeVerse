import { LibraryList } from "@/components/library/LibraryList";

export const metadata = { title: "Library · VibeVerse" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">
        Your Library
      </h1>
      <LibraryList />
    </div>
  );
}
