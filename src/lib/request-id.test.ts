import { describe, expect, it } from "vitest";
import { isSafeRequestId, resolveRequestId } from "./request-id";

describe("request IDs", () => {
  it("preserves conservative IDs from trusted upstreams", () => {
    expect(isSafeRequestId("req_1234-abc:edge.1")).toBe(true);
    expect(resolveRequestId("req_1234-abc:edge.1", () => "generated")).toBe(
      "req_1234-abc:edge.1",
    );
  });

  it("rejects whitespace, control characters, and oversized values", () => {
    expect(isSafeRequestId("has spaces")).toBe(false);
    expect(isSafeRequestId("line\nbreak")).toBe(false);
    expect(isSafeRequestId("x".repeat(129))).toBe(false);
  });

  it("generates a replacement for missing or unsafe input", () => {
    expect(resolveRequestId(undefined, () => "generated-id")).toBe(
      "generated-id",
    );
    expect(resolveRequestId("unsafe value", () => "generated-id")).toBe(
      "generated-id",
    );
  });
});
