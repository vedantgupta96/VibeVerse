import { pool } from "./index";

/**
 * Dev seed skeleton (see DATABASE.md → Seed Script).
 *
 * Full seeding is intentionally deferred: creating the demo user needs the
 * Better Auth instance (Phase 3) and populating saved tracks needs the Deezer
 * MusicProvider (Phase 4). This file is the structure those phases fill in.
 *
 * Once those land, wire a runner (e.g. `tsx src/server/db/seed.ts`) and a
 * `db:seed` npm script.
 */
export async function seed(): Promise<void> {
  // TODO(Phase 3): create demo user (demo@vibeverse.app / demo1234) via Better Auth.
  // TODO(Phase 4): fetch ~15 tracks across 3 genres from Deezer and upsert + save them.
  // TODO(Phase 6): attach ~5 memories (embeddings skipped / null for the skeleton).
  console.info(
    "[seed] skeleton only — implement after Phase 3 (auth) and Phase 4 (provider).",
  );
}

async function main() {
  try {
    await seed();
  } finally {
    await pool.end();
  }
}

// Run only when executed directly (not when imported).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
