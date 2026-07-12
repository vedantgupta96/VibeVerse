import { CreateRoomForm } from "@/components/rooms/CreateRoomForm";
import { JoinByCodeForm } from "@/components/rooms/JoinByCodeForm";
import { RoomList } from "@/components/rooms/RoomList";

export const metadata = { title: "Vibe Rooms · VibeVerse" };

export default function RoomsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="relative overflow-hidden pb-10 pt-4">
        <div
          className="pointer-events-none absolute -left-20 -top-32 size-96 rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,.15), transparent 70%)",
          }}
          aria-hidden
        />
        <h1 className="relative text-balance font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl">
          Vibe Rooms
        </h1>
        <p className="relative mt-4 max-w-xl text-pretty text-base leading-7 text-stardust">
          Listen together, live. Queue tracks, vote on what plays next, and let the
          AI DJ read the room.
        </p>
      </section>

      <section className="glass flex flex-col gap-6 rounded-lg p-6 sm:flex-row sm:gap-8">
        <div className="flex-1">
          <CreateRoomForm />
        </div>
        <div className="hidden w-px self-stretch bg-border sm:block" aria-hidden />
        <div className="border-t border-border pt-6 sm:flex-1 sm:border-t-0 sm:pt-0">
          <JoinByCodeForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Open rooms</h2>
        <RoomList />
      </section>
    </div>
  );
}
