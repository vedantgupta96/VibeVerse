import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { assertRoomMember } from "@/server/services/room-access";
import { subscribeToRoom } from "@/server/realtime/bus";
import {
  formatSseEvent,
  SSE_CONNECTED_COMMENT,
  SSE_HEARTBEAT_COMMENT,
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_RETRY_DIRECTIVE,
} from "@/server/realtime/sse";
import { roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
// Vercel route handlers have duration limits that would otherwise close a
// long-lived stream early; EventSource auto-reconnects and the client
// refetches the room snapshot on every `open` (see lib/realtime.ts), so a
// forced close just looks like a brief reconnect blip, never a lost update.
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  let roomId: string;
  try {
    const user = await requireUser(await headers());
    roomId = roomIdSchema.parse((await params).id);
    await assertRoomMember(user.id, roomId); // 404/403 before we ever open the stream
  } catch (error) {
    return toErrorResponse(error, request);
  }

  const encoder = new TextEncoder();
  // `released` gates resource cleanup (heartbeat timer + bus subscription +
  // controller), reachable from three independent triggers: a client abort,
  // `cancel()` from the stream consumer, and `safeEnqueue` discovering a dead
  // connection on write. All three must converge on exactly one teardown.
  let released = false;
  let unsubscribe: (() => void) | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;

  const release = () => {
    if (released) return;
    released = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    unsubscribe?.();
    try {
      streamController?.close();
    } catch {
      // Already closed by the runtime — nothing to do.
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamController = controller;

      const safeEnqueue = (chunk: string) => {
        if (released) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The write failed — the connection is already dead even though no
          // `abort` event has fired yet. Release now rather than merely
          // marking the stream closed, which would otherwise leak the
          // heartbeat timer and bus subscription forever.
          release();
        }
      };

      request.signal.addEventListener("abort", release);

      safeEnqueue(SSE_RETRY_DIRECTIVE);
      safeEnqueue(SSE_CONNECTED_COMMENT);

      unsubscribe = await subscribeToRoom(roomId, (event) => {
        safeEnqueue(formatSseEvent(event));
      });
      // release() (abort, or a failed early write) could have already fired
      // while we were awaiting the subscribe call.
      if (released) {
        unsubscribe();
        return;
      }

      heartbeatTimer = setInterval(() => {
        safeEnqueue(SSE_HEARTBEAT_COMMENT);
      }, SSE_HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      release();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
