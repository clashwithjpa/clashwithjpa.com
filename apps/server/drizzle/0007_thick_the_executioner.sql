ALTER TABLE "settings_table" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "settings_table" ALTER COLUMN "id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "settings_table" ADD CONSTRAINT "settings_table_single_row" CHECK ("settings_table"."id" = 1);