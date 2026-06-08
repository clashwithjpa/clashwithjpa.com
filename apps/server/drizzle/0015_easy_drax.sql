ALTER TABLE "coc_account_table" ADD COLUMN "current_clan" text;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "town_hall" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "total_donated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "total_received" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "clan_games" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "capital_gold_looted" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "capital_gold_contributed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD COLUMN "activity_score" integer DEFAULT 0 NOT NULL;