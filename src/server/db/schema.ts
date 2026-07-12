import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
// Mood values live in lib/moods (shared with the client + Zod). The
// memories_mood_check constraint must match MOODS.
import { MOODS, type Mood } from "@/lib/moods";

/* -------------------------------------------------------------------------- */
/* Better Auth tables                                                         */
/*                                                                            */
/* Column names match Better Auth's default Drizzle output (camelCase). Do    */
/* not hand-edit their shape — the Phase 3 auth instance points its adapter   */
/* at these exact tables (see ARCHITECTURE.md → Auth). Application tables      */
/* below reference user.id with ON DELETE CASCADE.                            */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Application tables                                                          */
/* -------------------------------------------------------------------------- */

export { MOODS, type Mood };

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerId: text("provider_id").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("artists_provider_provider_id_key").on(t.provider, t.providerId),
    index("artists_name_idx").on(t.name),
  ],
);

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerId: text("provider_id").notNull(),
    title: text("title").notNull(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    albumName: text("album_name"),
    albumImageUrl: text("album_image_url"),
    previewUrl: text("preview_url"),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tracks_provider_provider_id_key").on(t.provider, t.providerId),
    index("tracks_artist_id_idx").on(t.artistId),
  ],
);

export const savedTracks = pgTable(
  "saved_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_tracks_user_track_key").on(t.userId, t.trackId),
    index("saved_tracks_user_created_idx").on(t.userId, t.createdAt.desc()),
  ],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    mood: text("mood").$type<Mood>(),
    // null = embedding failed or pending (see PRODUCT_SPEC F4)
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("memories_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("memories_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    check(
      "memories_content_len_check",
      sql`char_length(${t.content}) between 1 and 2000`,
    ),
    check(
      "memories_mood_check",
      sql`${t.mood} is null or ${t.mood} in ('joyful','nostalgic','melancholy','energetic','calm','romantic','gritty','dreamy')`,
    ),
  ],
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    vibeDescription: text("vibe_description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("playlists_user_created_idx").on(t.userId, t.createdAt.desc())],
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    reason: text("reason").notNull(),
  },
  (t) => [
    uniqueIndex("playlist_tracks_position_key").on(t.playlistId, t.position),
    uniqueIndex("playlist_tracks_track_key").on(t.playlistId, t.trackId),
  ],
);

type GenreCount = { name: string; count: number };
type ArtistCount = {
  id: string;
  name: string;
  imageUrl: string | null;
  count: number;
};
type MoodCount = { mood: Mood; count: number };

/* -------------------------------------------------------------------------- */
/* Vibe Rooms (Phase 10)                                                      */
/*                                                                            */
/* Reactions are deliberately NOT a table — they're an ephemeral Redis-only   */
/* broadcast (see server/realtime/bus.ts). Now-playing is a status flag on    */
/* the queue item, not a column on rooms, so there's no circular FK and       */
/* played history is free. Queue order has no position column: it's computed */
/* (voteScore DESC, createdAt ASC, id ASC) — see services/room-queue.ts.      */
/* -------------------------------------------------------------------------- */

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vibeSummary: text("vibe_summary"),
    vibeSummaryAt: timestamp("vibe_summary_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("rooms_code_key").on(t.code),
    check(
      "rooms_name_len_check",
      sql`char_length(${t.name}) between 1 and 80`,
    ),
  ],
);

export const roomMembers = pgTable(
  "room_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Presence heartbeat: "active" = lastSeenAt within the last 60s, computed
    // in services/rooms.ts (survives the no-Redis fallback — see ARCHITECTURE.md).
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("room_members_room_user_key").on(t.roomId, t.userId),
    index("room_members_room_idx").on(t.roomId),
  ],
);

export const roomQueueItems = pgTable(
  "room_queue_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("room_queue_items_room_idx").on(t.roomId),
    check(
      "room_queue_items_status_check",
      sql`${t.status} in ('queued','playing','played')`,
    ),
    // At most one "playing" item per room.
    uniqueIndex("room_queue_items_one_playing_key")
      .on(t.roomId)
      .where(sql`status = 'playing'`),
    // At most one active (queued/playing) instance of a track per room —
    // played history can repeat.
    uniqueIndex("room_queue_items_active_track_key")
      .on(t.roomId, t.trackId)
      .where(sql`status <> 'played'`),
  ],
);

export const roomQueueVotes = pgTable(
  "room_queue_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueItemId: uuid("queue_item_id")
      .notNull()
      .references(() => roomQueueItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("room_queue_votes_item_user_key").on(t.queueItemId, t.userId),
    check("room_queue_votes_value_check", sql`${t.value} in (-1,1)`),
  ],
);

export const tasteProfiles = pgTable("taste_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  listenerArchetype: text("listener_archetype").notNull(),
  traits: jsonb("traits").$type<string[]>().notNull(),
  topGenres: jsonb("top_genres").$type<GenreCount[]>().notNull(),
  topArtists: jsonb("top_artists").$type<ArtistCount[]>().notNull(),
  moodDistribution: jsonb("mood_distribution").$type<MoodCount[]>().notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
