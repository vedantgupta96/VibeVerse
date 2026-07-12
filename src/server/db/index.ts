import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Reuse one pool across Next.js dev-server module reloads
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool(
    env.DATABASE_URL
      ? {
          connectionString: env.DATABASE_URL,
          // Keep serverless instances from multiplying large pools. The
          // Supabase transaction pooler owns cross-instance concurrency.
          max: process.env.NODE_ENV === "production" ? 5 : 10,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 30_000,
        }
      : {},
  );

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };

/**
 * True when `error` is a Postgres unique-violation (23505) on the named
 * constraint. Used to turn a race-condition insert failure into a clean
 * retry (room code collisions) or a friendly VALIDATION_ERROR (duplicate
 * active queue track) instead of leaking a raw DB error.
 *
 * drizzle-orm wraps the underlying `pg` error in a `DrizzleQueryError`, whose
 * `.code`/`.constraint` live on `.cause` rather than the error itself — check
 * both so this works whether the caller sees the raw pg error or Drizzle's wrapper.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const matches = (candidate: unknown): boolean =>
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as { code?: string }).code === "23505" &&
    (candidate as { constraint?: string }).constraint === constraint;

  if (matches(error)) return true;
  if (error instanceof Error && matches(error.cause)) return true;
  return false;
}
