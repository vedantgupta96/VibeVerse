import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, toErrorResponse } from "./errors";

describe("ApiError", () => {
  it("derives HTTP status from the error code", () => {
    expect(new ApiError("UNAUTHORIZED").status).toBe(401);
    expect(new ApiError("VALIDATION_ERROR").status).toBe(400);
    expect(new ApiError("PROVIDER_UNAVAILABLE").status).toBe(502);
    expect(new ApiError("AI_REFUSED").status).toBe(422);
    expect(new ApiError("RATE_LIMITED").status).toBe(429);
  });

  it("uses the code as message fallback", () => {
    expect(new ApiError("NOT_FOUND").message).toBe("NOT_FOUND");
    expect(new ApiError("NOT_FOUND", "Track not found").message).toBe(
      "Track not found",
    );
  });
});

describe("toErrorResponse", () => {
  it("serializes ApiError into the envelope", async () => {
    const res = toErrorResponse(
      new ApiError("RATE_LIMITED", "Cooldown", { retryAfterSeconds: 120 }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Cooldown",
        details: { retryAfterSeconds: 120 },
      },
    });
  });

  it("omits details when not provided", async () => {
    const res = toErrorResponse(new ApiError("NOT_FOUND"));
    const body = await res.json();
    expect(body.error).not.toHaveProperty("details");
  });

  it("maps ZodError to VALIDATION_ERROR with fieldErrors", async () => {
    const schema = z.object({ content: z.string().max(5) });
    const result = schema.safeParse({ content: "too long" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const res = toErrorResponse(result.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.content).toBeDefined();
  });

  it("maps unknown errors to INTERNAL without leaking internals", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const res = toErrorResponse(new Error("secret stack detail"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("secret stack detail");
    consoleError.mockRestore();
  });
});
