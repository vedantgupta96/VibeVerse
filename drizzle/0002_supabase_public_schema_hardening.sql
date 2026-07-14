-- VibeVerse uses Supabase as a server-side PostgreSQL host only. The migration
-- role owns the application objects (`postgres` in production), so it keeps
-- owner access and bypasses RLS. Supabase Data API roles receive no policies.

DO $$
DECLARE
	data_api_role text;
	object_owner text := current_user;
BEGIN
	FOREACH data_api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
	LOOP
		-- These roles exist on Supabase but not in the local PostgreSQL fixture.
		IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = data_api_role) THEN
			EXECUTE format(
				'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
				data_api_role
			);
			EXECUTE format(
				'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
				data_api_role
			);
			EXECUTE format(
				'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I',
				data_api_role
			);

			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
				object_owner,
				data_api_role
			);
			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
				object_owner,
				data_api_role
			);
			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
				object_owner,
				data_api_role
			);
		END IF;
	END LOOP;
END
$$;
--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.room_queue_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.room_queue_votes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.saved_tracks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.taste_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;
