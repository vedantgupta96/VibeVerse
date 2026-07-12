"use client";

import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRooms } from "@/hooks/useRooms";

export function RoomList() {
  const rooms = useRooms();
  const items = rooms.data?.pages.flatMap((page) => page.rooms) ?? [];

  if (rooms.isLoading) {
    return (
      <div className="flex justify-center py-16 text-faint">
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
      </div>
    );
  }

  if (rooms.isError) {
    return (
      <p className="py-10 text-center text-sm text-stardust">
        Rooms couldn&apos;t be reached. Refresh this page to try again.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users className="size-6 text-faint" aria-hidden />
        <p className="text-sm text-star">No rooms yet</p>
        <p className="max-w-sm text-xs leading-5 text-stardust">
          Start one above, or ask a friend for their room code.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((room) => (
        <Link
          key={room.id}
          href={`/rooms/${room.id}`}
          className="glass flex items-center justify-between gap-4 rounded-lg p-4 transition-colors hover:bg-space-3"
        >
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-medium">{room.name}</p>
            <p className="mt-0.5 font-mono text-xs text-faint">{room.code}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-stardust">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {room.activeCount} listening
          </div>
        </Link>
      ))}
      {rooms.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => rooms.fetchNextPage()}
          disabled={rooms.isFetchingNextPage}
          className="mt-2 self-center"
        >
          {rooms.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
