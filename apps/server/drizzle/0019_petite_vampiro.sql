CREATE TABLE "cwl_season_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "cwl_season_table" ("name", "month", "year")
SELECT DISTINCT "month" || ' ' || "year"::text, "month", "year"
FROM "cwl_application_table";
--> statement-breakpoint
ALTER TABLE "cwl_application_table" DROP CONSTRAINT "cwl_table_accountTag_preferenceNum_month_year_unique";--> statement-breakpoint
ALTER TABLE "cwl_application_table" DROP CONSTRAINT "cwl_table_userId_preferenceNum_month_year_unique";--> statement-breakpoint
ALTER TABLE "cwl_application_table" DROP CONSTRAINT "cwl_table_accountTag_month_year_unique";--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD COLUMN "season_id" integer;--> statement-breakpoint
UPDATE "cwl_application_table" a SET "season_id" = s."id" FROM "cwl_season_table" s WHERE s."month" = a."month" AND s."year" = a."year";--> statement-breakpoint
ALTER TABLE "cwl_application_table" ALTER COLUMN "season_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD CONSTRAINT "cwl_application_table_season_id_cwl_season_table_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."cwl_season_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cwl_application_season_id_idx" ON "cwl_application_table" USING btree ("season_id");--> statement-breakpoint
ALTER TABLE "cwl_application_table" DROP COLUMN "month";--> statement-breakpoint
ALTER TABLE "cwl_application_table" DROP COLUMN "year";--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD CONSTRAINT "cwl_table_accountTag_preferenceNum_season_unique" UNIQUE("coc_account_tag","preference_num","season_id");--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD CONSTRAINT "cwl_table_userId_preferenceNum_season_unique" UNIQUE("discord_user_id","preference_num","season_id");--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD CONSTRAINT "cwl_table_accountTag_season_unique" UNIQUE("coc_account_tag","season_id");--> statement-breakpoint
DELETE FROM "cwl_bonus_table";--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" DROP CONSTRAINT "cwl_bonus_table_pkey";--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ALTER COLUMN "coc_account_tag" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD COLUMN "awarded_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" DROP COLUMN "months";--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD CONSTRAINT "cwl_bonus_table_discord_user_id_season_id_pk" PRIMARY KEY("discord_user_id","season_id");--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD CONSTRAINT "cwl_bonus_table_season_id_cwl_season_table_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."cwl_season_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cwl_bonus_season_id_idx" ON "cwl_bonus_table" USING btree ("season_id");--> statement-breakpoint
ALTER TABLE "settings_table" ADD COLUMN "current_cwl_season_id" integer;--> statement-breakpoint
ALTER TABLE "settings_table" ADD CONSTRAINT "settings_table_current_cwl_season_id_cwl_season_table_id_fk" FOREIGN KEY ("current_cwl_season_id") REFERENCES "public"."cwl_season_table"("id") ON DELETE set null ON UPDATE no action;
