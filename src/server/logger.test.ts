import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, normalizeLogValue } from "./logger";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("structured logger", () => {
  it("normalizes errors and redacts sensitive fields", () => {
    expect(
      normalizeLogValue({
        error: new Error("database failed"),
        password: "never-log-this",
        authorization: "Bearer secret-token",
        databaseUrl: "postgres://user:pass@db.example.com/app",
      }),
    ).toMatchObject({
      error: {
        name: "Error",
        message: "database failed",
        stack: expect.stringContaining("Error: database failed"),
      },
      password: "[REDACTED]",
      authorization: "[REDACTED]",
      databaseUrl: "[REDACTED]",
    });
  });

  it("emits one JSON record in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const output = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("api.unexpected_error", {
      requestId: "req-1",
      error: new Error("failed"),
    });

    expect(output).toHaveBeenCalledTimes(1);
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "error",
      event: "api.unexpected_error",
      requestId: "req-1",
      error: {
        name: "Error",
        message: "failed",
        stack: expect.stringContaining("Error: failed"),
      },
    });
  });
});
