ALTER TABLE "settings_table" ADD COLUMN "cwl_ping_channel_id" text;--> statement-breakpoint
ALTER TABLE "settings_table" DROP COLUMN "cwl_ping_webhook_url";