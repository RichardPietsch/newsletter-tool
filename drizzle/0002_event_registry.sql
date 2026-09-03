CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"speaker_name" text,
	"speaker_role" text,
	"date" text,
	"location" text,
	"description" text,
	"button_label" text,
	"button_url" text,
	"image" jsonb,
	"external_source" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_tenant_updated_idx" ON "events" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "events_tenant_external_idx" ON "events" USING btree ("tenant_id","external_source","external_id");