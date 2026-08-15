CREATE TABLE IF NOT EXISTS "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"original_filename" text NOT NULL,
	"title" text,
	"alt_text" text,
	"mime_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"seed_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"outcome" text DEFAULT 'succeeded' NOT NULL,
	"summary" text NOT NULL,
	"correlation_id" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_magic_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"requested_ip" text,
	"user_agent" text,
	CONSTRAINT "auth_magic_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletters" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"document" jsonb NOT NULL,
	"seed_key" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"support_tenant_id" text,
	"support_started_at" timestamp,
	"user_agent" text,
	"ip_address" text,
	CONSTRAINT "sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"admin_notes" text,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"role" text DEFAULT 'tenant_member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'tenant_member' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletters" ADD COLUMN IF NOT EXISTS "tenant_id" text;--> statement-breakpoint
ALTER TABLE "newsletters" ADD COLUMN IF NOT EXISTS "seed_key" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "tenant_id" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "seed_key" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "tenant_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "support_tenant_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "support_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "tenant_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "actor_user_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "outcome" text DEFAULT 'succeeded';--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "summary" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "correlation_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "entity_type" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users") THEN
    INSERT INTO "tenants" ("id", "name", "status")
    VALUES ('development-tenant', 'Entwicklungsmandant', 'active')
    ON CONFLICT ("id") DO NOTHING;

    UPDATE "users"
    SET "tenant_id" = COALESCE("tenant_id", 'development-tenant'),
        "role" = COALESCE("role", 'tenant_member'),
        "status" = COALESCE("status", 'active'),
        "email" = lower(btrim("email"));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newsletters' AND column_name = 'owner_id') THEN
    EXECUTE 'UPDATE "newsletters" n SET "tenant_id" = u."tenant_id" FROM "users" u WHERE n."owner_id" = u."id" AND n."tenant_id" IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'owner_id') THEN
    EXECUTE 'UPDATE "assets" a SET "tenant_id" = u."tenant_id" FROM "users" u WHERE a."owner_id" = u."id" AND a."tenant_id" IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'owner_id') THEN
    EXECUTE 'UPDATE "app_settings" s SET "tenant_id" = u."tenant_id" FROM "users" u WHERE s."owner_id" = u."id" AND s."tenant_id" IS NULL';
    EXECUTE 'UPDATE "app_settings" SET "tenant_id" = ''development-tenant'' WHERE "tenant_id" IS NULL AND EXISTS (SELECT 1 FROM "tenants" WHERE "id" = ''development-tenant'')';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_events' AND column_name = 'user_id') THEN
    EXECUTE 'UPDATE "audit_events" a SET "actor_user_id" = a."user_id" WHERE a."actor_user_id" IS NULL';
    EXECUTE 'UPDATE "audit_events" a SET "tenant_id" = u."tenant_id" FROM "users" u WHERE a."actor_user_id" = u."id" AND a."tenant_id" IS NULL';
  END IF;

  UPDATE "audit_events"
  SET "severity" = COALESCE("severity", 'info'),
      "outcome" = COALESCE("outcome", 'succeeded'),
      "summary" = COALESCE("summary", left("event_type", 240)),
      "correlation_id" = COALESCE("correlation_id", "id"),
      "metadata" = COALESCE("metadata", '{}'::jsonb);

  -- Settings are tenant-wide after this migration. Preserve the most recently
  -- updated row if the former per-user model produced more than one row.
  DELETE FROM "app_settings" older
  USING "app_settings" newer
  WHERE older."tenant_id" = newer."tenant_id"
    AND (older."updated_at", older."id") < (newer."updated_at", newer."id");

  IF EXISTS (SELECT 1 FROM "newsletters" WHERE "tenant_id" IS NULL)
     OR EXISTS (SELECT 1 FROM "assets" WHERE "tenant_id" IS NULL)
     OR EXISTS (SELECT 1 FROM "app_settings" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Tenant migration found business records that cannot be assigned safely';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "newsletters" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "severity" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "outcome" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "summary" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "correlation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "metadata" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletters" DROP COLUMN IF EXISTS "owner_id";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN IF EXISTS "owner_id";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "owner_id";--> statement-breakpoint
ALTER TABLE "audit_events" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
UPDATE "auth_magic_links" SET "consumed_at" = COALESCE("consumed_at", now());--> statement-breakpoint
UPDATE "sessions" SET "revoked_at" = COALESCE("revoked_at", now());--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenants" ADD CONSTRAINT "tenants_status_check" CHECK ("status" in ('active', 'inactive'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenants" ADD CONSTRAINT "tenants_name_check" CHECK (length(btrim("name")) > 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" in ('platform_admin', 'tenant_member'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("status" in ('active', 'inactive'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_membership_check" CHECK (("role" = 'platform_admin' and "tenant_id" is null) or ("role" = 'tenant_member' and "tenant_id" is not null));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_normalized_email_check" CHECK ("email" = lower(btrim("email")));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_severity_check" CHECK ("severity" in ('info', 'warning', 'error'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_outcome_check" CHECK ("outcome" in ('succeeded', 'failed', 'blocked'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_summary_size_check" CHECK (length("summary") <= 240);
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_metadata_size_check" CHECK (octet_length("metadata"::text) <= 4096);
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_support_tenant_id_tenants_id_fk" FOREIGN KEY ("support_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_settings_tenant_idx" ON "app_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_tenant_created_idx" ON "assets" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assets_tenant_storage_idx" ON "assets" USING btree ("tenant_id","storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assets_tenant_seed_idx" ON "assets" USING btree ("tenant_id","seed_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_tenant_created_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_tenant_type_created_idx" ON "audit_events" USING btree ("tenant_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_severity_created_idx" ON "audit_events" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_correlation_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_links_email_idx" ON "auth_magic_links" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_links_created_idx" ON "auth_magic_links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_links_expires_idx" ON "auth_magic_links" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_rate_limits_window_idx" ON "auth_rate_limits" USING btree ("scope","key_hash","window_started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_rate_limits_expires_idx" ON "auth_rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletters_tenant_updated_idx" ON "newsletters" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "newsletters_tenant_seed_idx" ON "newsletters" USING btree ("tenant_id","seed_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_support_tenant_idx" ON "sessions" USING btree ("support_tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_activity_idx" ON "tenants" USING btree ("last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_single_platform_admin_idx" ON "users" USING btree ("role") WHERE "users"."role" = 'platform_admin';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_status_idx" ON "users" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_login_idx" ON "users" USING btree ("tenant_id","last_login_at");
