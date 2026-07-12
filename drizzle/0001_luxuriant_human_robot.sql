CREATE TABLE "room_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"added_by_user_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_queue_items_status_check" CHECK ("room_queue_items"."status" in ('queued','playing','played'))
);
--> statement-breakpoint
CREATE TABLE "room_queue_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_item_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_queue_votes_value_check" CHECK ("room_queue_votes"."value" in (-1,1))
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"vibe_summary" text,
	"vibe_summary_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_name_len_check" CHECK (char_length("rooms"."name") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_items" ADD CONSTRAINT "room_queue_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_items" ADD CONSTRAINT "room_queue_items_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_items" ADD CONSTRAINT "room_queue_items_added_by_user_id_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_votes" ADD CONSTRAINT "room_queue_votes_queue_item_id_room_queue_items_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."room_queue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue_votes" ADD CONSTRAINT "room_queue_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_members_room_user_key" ON "room_members" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "room_members_room_idx" ON "room_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_queue_items_room_idx" ON "room_queue_items" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_queue_items_one_playing_key" ON "room_queue_items" USING btree ("room_id") WHERE status = 'playing';--> statement-breakpoint
CREATE UNIQUE INDEX "room_queue_items_active_track_key" ON "room_queue_items" USING btree ("room_id","track_id") WHERE status <> 'played';--> statement-breakpoint
CREATE UNIQUE INDEX "room_queue_votes_item_user_key" ON "room_queue_votes" USING btree ("queue_item_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms" USING btree ("code");