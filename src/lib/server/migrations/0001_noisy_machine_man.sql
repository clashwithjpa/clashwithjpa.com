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
ALTER TABLE "users_table" RENAME TO "user_table";--> statement-breakpoint
ALTER TABLE "coc_table" DROP CONSTRAINT "coc_table_user_id_users_table_id_fk";
--> statement-breakpoint
ALTER TABLE "coc_table" ADD CONSTRAINT "coc_table_user_id_user_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_table"("id") ON DELETE cascade ON UPDATE no action;