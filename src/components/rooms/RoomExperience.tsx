"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { NowPlayingCard } from "@/components/rooms/NowPlayingCard";
import { QueuePanel } from "@/components/rooms/QueuePanel";
import { ReactionBar } from "@/components/rooms/ReactionBar";
import { ReactionOverlay, type FloatingReaction } from "@/components/rooms/ReactionOverlay";
import { PresenceRoster } from "@/components/rooms/PresenceRoster";
import { VibeSummaryCard } from "@/components/rooms/VibeSummaryCard";
import { Button } from "@/components/ui/button";
import {
  useAdvance,
  useJoinRoom,
  useLeaveRoom,
  useRoomEvents,
  useRoomPresence,
  useRoomSnapshot,
} from "@/hooks/useRoom";
import { authClient } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const REACTION_LIFETIME_MS = 3_000;

export function RoomExperience({ roomId }: { roomId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id;

  const join = useJoinRoom(roomId);
  const { mutate: joinRoom, reset: resetJoin } = join;
  const leave = useLeaveRoom(roomId);
  const attemptedRoomId = useRef<string | null>(null);

  useEffect(() => {
    if (attemptedRoomId.current === roomId) return;
    attemptedRoomId.current = roomId;
    resetJoin();
    joinRoom();
  }, [roomId, joinRoom, resetJoin]);

  // Mutation state can briefly belong to the previous room during an App
  // Router param transition. Match the returned snapshot to this room before
  // enabling its snapshot, presence, or EventSource lifecycle.
  const joined = join.isSuccess && join.data.room.id === roomId;

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const { connected } = useRoomEvents(roomId, joined, (event) => {
    const id = `${event.userId}-${event.at}-${Math.random().toString(36).slice(2)}`;
    setReactions((prev) => [...prev, { id, event }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, REACTION_LIFETIME_MS);
  });
  const snapshot = useRoomSnapshot(roomId, joined, connected);
  useRoomPresence(roomId, joined);

  const advance = useAdvance(roomId);

  if (join.isError) {
    const notFound =
      join.error instanceof ApiClientError && join.error.code === "NOT_FOUND";
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <AlertTriangle className="mx-auto size-8 text-danger" aria-hidden />
        <h1 className="mt-5 font-display text-2xl font-semibold">
          {notFound ? "This room doesn't exist" : "Couldn't join this room"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stardust">
          It may have closed, or the link is off. Head back and find another one.
        </p>
        <Link
          href="/rooms"
          className="gradient-aurora mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-void"
        >
          Back to Vibe Rooms
        </Link>
      </section>
    );
  }

  if (snapshot.isError) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <AlertTriangle className="mx-auto size-8 text-danger" aria-hidden />
        <h1 className="mt-5 font-display text-2xl font-semibold">
          Unable to load this room
        </h1>
        <p className="mt-3 text-sm leading-6 text-stardust">
          The connection may have dropped. Try loading the room again.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => void snapshot.refetch()}
            disabled={snapshot.isFetching}
          >
            {snapshot.isFetching ? "Trying again…" : "Try again"}
          </Button>
          <Link
            href="/rooms"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-star transition-colors hover:bg-space-3"
          >
            Back to Vibe Rooms
          </Link>
        </div>
      </section>
    );
  }

  if (!joined || snapshot.isLoading || !snapshot.data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-faint">
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
      </div>
    );
  }

  const room = snapshot.data.room;

  return (
    <div className="relative mx-auto max-w-6xl pb-16">
      <ReactionOverlay reactions={reactions} />

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-stardust">
            <span
              className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-faint")}
              aria-hidden
            />
            {connected ? "Live" : "Reconnecting…"}
            <span className="font-mono text-faint">· {room.code}</span>
          </div>
          <h1 className="mt-2 text-balance font-display text-3xl font-semibold tracking-[-.02em] sm:text-4xl">
            {room.name}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            leave.mutate(undefined, { onSuccess: () => router.push("/rooms") })
          }
          disabled={leave.isPending}
        >
          {leave.isPending ? "Leaving…" : "Leave room"}
        </Button>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <NowPlayingCard
            room={room}
            onAdvance={() => advance.mutate()}
            advancing={advance.isPending}
          />
          <QueuePanel room={room} currentUserId={currentUserId} />
          <ReactionBar roomId={roomId} />
        </div>
        <aside className="flex flex-col gap-6">
          <VibeSummaryCard room={room} />
          <PresenceRoster members={room.members} />
        </aside>
      </div>
    </div>
  );
}
