CREATE TYPE "public"."clan_application_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "base_info_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"coc_base_level" text NOT NULL,
	"coc_base_link" text NOT NULL,
	"coc_base_image_link" text NOT NULL,
	CONSTRAINT "base_info_table_coc_base_level_unique" UNIQUE("coc_base_level")
);
--> statement-breakpoint
CREATE TABLE "clan_application_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"coc_account_tag" text NOT NULL,
	"coc_account_data" jsonb NOT NULL,
	"discord_user_id" text NOT NULL,
	"status" "clan_application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clan_application_table_coc_account_tag_unique" UNIQUE("coc_account_tag")
);
--> statement-breakpoint
CREATE TABLE "clan_info_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"coc_clan_code" text NOT NULL,
	"coc_clan_name" text,
	"coc_clan_level" integer,
	"coc_clan_tag" text NOT NULL,
	"discord_clan_role_id" text NOT NULL,
	"discord_clan_channel_id" text NOT NULL,
	"discord_member_role_id" text NOT NULL,
	"discord_elder_role_id" text NOT NULL,
	"discord_coleader_role_id" text NOT NULL,
	"discord_leader_role_id" text NOT NULL,
	"discord_leader_id" text NOT NULL,
	"attacks_requirement" integer NOT NULL,
	"donations_requirement" integer NOT NULL,
	"clangames_requirement" integer NOT NULL,
	"coc_clan_data" jsonb,
	"coc_clan_current_war_data" jsonb,
	CONSTRAINT "clan_info_table_coc_clan_code_unique" UNIQUE("coc_clan_code"),
	CONSTRAINT "clan_info_table_coc_clan_tag_unique" UNIQUE("coc_clan_tag")
);
--> statement-breakpoint
CREATE TABLE "coc_account_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"coc_account_tag" text NOT NULL,
	CONSTRAINT "coc_account_table_coc_account_tag_unique" UNIQUE("coc_account_tag")
);
--> statement-breakpoint
CREATE TABLE "cwl_application_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"coc_account_name" text NOT NULL,
	"coc_account_tag" text NOT NULL,
	"coc_account_clan" text NOT NULL,
	"coc_account_weight" integer NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL,
	"preference_num" integer NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" text,
	CONSTRAINT "cwl_table_accountTag_preferenceNum_month_year_unique" UNIQUE("coc_account_tag","preference_num","month","year")
);
--> statement-breakpoint
CREATE TABLE "cwl_clan_info_table" (
	"coc_clan_tag" text PRIMARY KEY NOT NULL,
	"coc_clan_name" text NOT NULL,
	"coc_clan_league" text NOT NULL,
	"coc_clan_leader" text NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"applications_enabled" boolean DEFAULT false NOT NULL,
	"cwl_enabled" boolean DEFAULT false NOT NULL,
	"site_maintenance_mode" boolean DEFAULT false NOT NULL,
	"rules_content" text,
	"guild_id" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "coc_account_table" ADD CONSTRAINT "coc_account_table_discord_user_id_account_account_id_fk" FOREIGN KEY ("discord_user_id") REFERENCES "public"."account"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwl_application_table" ADD CONSTRAINT "cwl_application_table_assigned_to_cwl_clan_info_table_coc_clan_tag_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."cwl_clan_info_table"("coc_clan_tag") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clan_info_coc_clan_code_idx" ON "clan_info_table" USING btree ("coc_clan_code");--> statement-breakpoint
CREATE INDEX "clan_info_coc_clan_tag_idx" ON "clan_info_table" USING btree ("coc_clan_tag");--> statement-breakpoint
CREATE INDEX "clan_info_coc_clan_level_idx" ON "clan_info_table" USING btree ("coc_clan_level");--> statement-breakpoint
CREATE INDEX "coc_account_discord_user_id_idx" ON "coc_account_table" USING btree ("discord_user_id");--> statement-breakpoint
CREATE INDEX "cwl_application_discord_user_id_idx" ON "cwl_application_table" USING btree ("discord_user_id");