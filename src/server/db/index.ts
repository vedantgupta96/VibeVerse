import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

// Reuse one pool across Next.js dev-server module reloads
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ?? new Pool({ connectionString: env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

// Schema is registered here in Phase 2
export const db: NodePgDatabase = drizzle(pool);
