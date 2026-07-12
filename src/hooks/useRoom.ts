"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { RoomEvent } from "@/lib/realtime";
import type { Mood } from "@/lib/moods";
import type { RoomQueueItemDTO, RoomSnapshotDTO } from "@/lib/dto";

const HEARTBEAT_INTERVAL_MS = 30_000;
// Belt-and-braces floor so a room always converges even if SSE drops or is
// blocked (proxy, extension, etc.) — a deliberate deviation from the app's
// default no-polling QueryClient config (see app/providers.tsx). SSE is the
// fast path; this is the guaranteed one.
const SNAPSHOT_POLL_MS = 15_000;
// Presence heartbeats deliberately do not fan out over SSE. Even with a
// healthy stream, refresh once per presence window so members who close a tab
// become stale in the roster without waiting for an unrelated room event.
const PRESENCE_REFRESH_MS = 60_000;

function roomKey(roomId: string) {
  return ["room", roomId] as const;
}

type RoomSnapshotResponse = { room: RoomSnapshotDTO };

export function useRoomSnapshot(
  roomId: string,
  enabled: boolean,
  eventsConnected: boolean,
) {
  return useQuery({
    queryKey: roomKey(roomId),
    queryFn: () => apiFetch<RoomSnapshotResponse>(`/api/rooms/${roomId}`),
    enabled: enabled && Boolean(roomId),
    staleTime: 0,
    // SSE is the fast path and invalidates this snapshot for every persisted
    // event. The 15s convergence poll only runs while the stream is down;
    // connected rooms retain a slower refresh for non-broadcast presence
    // expiry (see useRoomPresence below).
    refetchInterval: eventsConnected ? PRESENCE_REFRESH_MS : SNAPSHOT_POLL_MS,
  });
}

export function useJoinRoom(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<RoomSnapshotResponse>(`/api/rooms/${roomId}/join`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(roomKey(roomId), data);
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useLeaveRoom(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/api/rooms/${roomId}/leave`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

/** 30s heartbeat while mounted and joined. No auto-leave on unmount — presence just goes stale. */
export function useRoomPresence(roomId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !roomId) return;
    const beat = () => {
      void apiFetch(`/api/rooms/${roomId}/heartbeat`, { method: "POST" }).catch(
        () => {},
      );
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roomId, enabled]);
}

function useInvalidateRoom(roomId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
}

export function useAddToQueue(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: (providerId: string) =>
      apiFetch<{ item: RoomQueueItemDTO }>(`/api/rooms/${roomId}/queue`, {
        method: "POST",
        body: JSON.stringify({ providerId }),
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveQueueItem(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/rooms/${roomId}/queue/${itemId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCastVote(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: 1 | -1 }) =>
      apiFetch<{ item: RoomQueueItemDTO }>(
        `/api/rooms/${roomId}/queue/${itemId}/vote`,
        { method: "PUT", body: JSON.stringify({ value }) },
      ),
    onSuccess: invalidate,
  });
}

export function useClearVote(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/rooms/${roomId}/queue/${itemId}/vote`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useAdvance(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: () =>
      apiFetch<{ nowPlaying: RoomQueueItemDTO | null }>(
        `/api/rooms/${roomId}/advance`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });
}

export function useReact(roomId: string) {
  return useMutation({
    mutationFn: (mood: Mood) =>
      apiFetch(`/api/rooms/${roomId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ mood }),
      }),
  });
}

export function useGenerateVibe(roomId: string) {
  const invalidate = useInvalidateRoom(roomId);
  return useMutation({
    mutationFn: () =>
      apiFetch<{ vibeSummary: string; generatedAt: string }>(
        `/api/rooms/${roomId}/vibe`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });
}

type ReactionEvent = Extract<RoomEvent, { type: "reaction" }>;

/**
 * EventSource wrapper. `onopen` (including every reconnect) invalidates the
 * snapshot so a reconnect heals any frame missed while disconnected. Every
 * event except `reaction` is treated as a pure invalidation hint — no
 * duplicate serializers, the client always refetches for DB truth (see
 * lib/realtime.ts's thin-event principle). `onReaction` is kept in a ref so
 * callers can pass an inline closure without retriggering the effect.
 */
export function useRoomEvents(
  roomId: string,
  enabled: boolean,
  onReaction: (event: ReactionEvent) => void,
) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const onReactionRef = useRef(onReaction);
  useEffect(() => {
    onReactionRef.current = onReaction;
  });

  useEffect(() => {
    if (!enabled || !roomId) return;
    const source = new EventSource(`/api/rooms/${roomId}/events`);

    source.onopen = () => {
      setConnected(true);
      void queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    };

    source.onmessage = (message) => {
      let event: RoomEvent;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      if (event.type === "reaction") {
        onReactionRef.current(event);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: roomKey(roomId) });
    };

    source.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects (server sends `retry: 3000`); onopen
      // above refetches once it's back — no manual retry logic needed here.
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [roomId, enabled, queryClient]);

  return { connected };
}
