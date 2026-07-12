import { describe, expect, it } from "vitest";
import {
  formatSseEvent,
  SSE_CONNECTED_COMMENT,
  SSE_HEARTBEAT_COMMENT,
  SSE_RETRY_DIRECTIVE,
} from "./sse";

describe("formatSseEvent", () => {
  it("frames a JSON payload as a data: line terminated by a blank line", () => {
    const framed = formatSseEvent({ type: "queue_updated" });
    expect(framed).toBe('data: {"type":"queue_updated"}\n\n');
  });

  it("frames primitives and null", () => {
    expect(formatSseEvent(null)).toBe("data: null\n\n");
    expect(formatSseEvent("hi")).toBe('data: "hi"\n\n');
  });
});

describe("comment frames", () => {
  it("are comment lines (curl/EventSource ignore ':'-prefixed lines)", () => {
    expect(SSE_CONNECTED_COMMENT.startsWith(":")).toBe(true);
    expect(SSE_HEARTBEAT_COMMENT.startsWith(":")).toBe(true);
    expect(SSE_CONNECTED_COMMENT.endsWith("\n\n")).toBe(true);
    expect(SSE_HEARTBEAT_COMMENT.endsWith("\n\n")).toBe(true);
  });
});

describe("SSE_RETRY_DIRECTIVE", () => {
  it("is a valid `retry:` field frame", () => {
    expect(SSE_RETRY_DIRECTIVE).toBe("retry: 3000\n\n");
  });
});
