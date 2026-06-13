import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const base = { DATABASE_URL: "postgres://test:test@localhost:5432/test" };

describe("envSchema", () => {
  it("requires DATABASE_URL", () => {
    expect(envSchema.safeParse({}).success).toBe(false);
    expect(envSchema.safeParse(base).success).toBe(true);
  });

  it("applies the model-tier defaults", () => {
    const env = envSchema.parse(base);
    expect(env.ANTHROPIC_FAST_MODEL).toBe("claude-haiku-4-5");
    expect(env.ANTHROPIC_DEFAULT_MODEL).toBe("claude-sonnet-4-6");
    expect(env.ANTHROPIC_STRONG_MODEL).toBe("claude-opus-4-8");
    expect(env.VOYAGE_MODEL).toBe("voyage-4-lite");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("lets explicit values override defaults", () => {
    const env = envSchema.parse({
      ...base,
      ANTHROPIC_DEFAULT_MODEL: "claude-opus-4-8",
    });
    expect(env.ANTHROPIC_DEFAULT_MODEL).toBe("claude-opus-4-8");
  });
});
