import "server-only";

/**
 * Pure SSE framing helpers for the room events route
 * (app/api/rooms/[id]/events/route.ts). No Last-Event-ID replay: the server
 * is stateless per connection — clients refetch the room snapshot on every
 * EventSource `open` (including reconnects), so a missed frame during a drop
 * just gets healed by the next refetch. See API_CONTRACTS.md → SSE contract.
 */

/** `data: <json>\n\n` — the only event frame shape this app emits. */
export function formatSseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** Tells EventSource how long to wait before auto-reconnecting on a drop. */
export const SSE_RETRY_DIRECTIVE = "retry: 3000\n\n";

/** Sent immediately on connect so clients (and `curl -N`) see the stream is live. */
export const SSE_CONNECTED_COMMENT = ": connected\n\n";

/** Comment-only keep-alive frame; browsers/curl ignore lines starting with `:`. */
export const SSE_HEARTBEAT_COMMENT = ": ping\n\n";

export const SSE_HEARTBEAT_INTERVAL_MS = 25_000;
