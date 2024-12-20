CREATE TABLE "coc_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_table" (
	"id" integer PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"is_clan_member" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coc_table" ADD CONSTRAINT "coc_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;