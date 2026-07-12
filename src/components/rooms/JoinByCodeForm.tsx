"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJoinRoomByCode } from "@/hooks/useRooms";
import { ApiClientError } from "@/lib/api-client";

export function JoinByCodeForm() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const join = useJoinRoomByCode();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    join.mutate(trimmed, {
      onSuccess: ({ room }) => router.push(`/rooms/${room.id}`),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="room-code" className="text-sm font-medium text-star">
        Join with a code
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="room-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="e.g. J8CTPQ"
          maxLength={12}
          className="font-mono tracking-widest"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!code.trim() || join.isPending}
          className="shrink-0"
        >
          <LogIn className="size-4" aria-hidden />
          {join.isPending ? "Joining…" : "Join by code"}
        </Button>
      </div>
      {join.isError && (
        <p className="text-xs text-danger" role="alert">
          {join.error instanceof ApiClientError && join.error.code === "NOT_FOUND"
            ? "No room with that code."
            : "Couldn't join. Try again."}
        </p>
      )}
    </form>
  );
}
