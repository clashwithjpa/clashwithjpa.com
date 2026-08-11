ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_webhook_url" text;--> statement-breakpoint
ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_interval_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_last_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_last_run_summary" text;