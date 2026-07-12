"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/useRooms";

export function CreateRoomForm() {
  const [name, setName] = useState("");
  const router = useRouter();
  const create = useCreateRoom();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: ({ room }) => router.push(`/rooms/${room.id}`),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="room-name" className="text-sm font-medium text-star">
        Start a room
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="room-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name your room…"
          maxLength={80}
        />
        <Button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="shrink-0"
        >
          <Plus className="size-4" aria-hidden />
          {create.isPending ? "Creating…" : "Create room"}
        </Button>
      </div>
      {create.isError && (
        <p className="text-xs text-danger" role="alert">
          Couldn&apos;t create that room. Try again.
        </p>
      )}
    </form>
  );
}
