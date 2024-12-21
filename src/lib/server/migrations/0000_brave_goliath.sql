CREATE TABLE "base_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"base_link" text NOT NULL,
	"image_link" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clan_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"clan_code" text NOT NULL,
	"clan_tag" text NOT NULL,
	"clan_role_id" text NOT NULL,
	"member_role_id" text NOT NULL,
	"elder_role_id" text NOT NULL,
	"coleader_role_id" text NOT NULL,
	"leader_role_id" text NOT NULL,
	"leader_id" text NOT NULL,
	"channel_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coc_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"username" text NOT NULL,
	"is_clan_member" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_table_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
ALTER TABLE "coc_table" ADD CONSTRAINT "coc_table_user_id_user_table_discord_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_table"("discord_id") ON DELETE cascade ON UPDATE no action;