import { z } from "zod";

/**
 * External service credentials are optional at build time. Routes that need
 * them validate availability at request time so preview builds can render the
 * app shell before every backing service has been provisioned.
 */
export const envSchema = z.object({
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  DATABASE_DIRECT_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),

  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_FAST_MODEL: z.string().default("claude-haiku-4-5"),
  ANTHROPIC_DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_STRONG_MODEL: z.string().default("claude-opus-4-8"),

  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default("voyage-4-lite"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Vibe Rooms realtime fan-out (Phase 10). Optional: unset → in-process bus
  // (single instance only). See server/realtime/bus.ts for the fallback.
  REDIS_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    const lines = Object.entries(fieldErrors)
      .map(([key, errors]) => `  ${key}: ${(errors ?? []).join(", ")}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

// Validated on first access (not import) so tests and build tooling can
// load modules that reference env without a fully configured process.env.
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    cached ??= loadEnv();
    return cached[prop as keyof Env];
  },
});
