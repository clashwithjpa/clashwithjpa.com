CREATE TABLE "clan_application_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag" text NOT NULL,
	"discord_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clan_table" ADD COLUMN "clan_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "clan_table" ADD COLUMN "attacks_requirement" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clan_table" ADD COLUMN "donations_requirement" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clan_table" ADD COLUMN "clangames_requirement" integer NOT NULL;