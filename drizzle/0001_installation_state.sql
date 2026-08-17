CREATE TABLE IF NOT EXISTS "installation_state" (
	"id" text PRIMARY KEY NOT NULL,
	"initial_admin_user_id" text NOT NULL,
	"bootstrap_source" text NOT NULL,
	"bootstrap_completed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_state" ADD CONSTRAINT "installation_state_initial_admin_user_id_users_id_fk" FOREIGN KEY ("initial_admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_state" ADD CONSTRAINT "installation_state_singleton_check" CHECK ("id" = 'primary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_state" ADD CONSTRAINT "installation_state_source_check" CHECK ("bootstrap_source" in ('cli', 'environment'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "installation_state_initial_admin_idx" ON "installation_state" USING btree ("initial_admin_user_id");
