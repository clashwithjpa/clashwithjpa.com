CREATE TABLE "guides_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"image_link" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"author" text NOT NULL,
	"description" text,
	"is_published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "guides_table_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "guides_table" ADD CONSTRAINT "guides_table_author_user_id_fk" FOREIGN KEY ("author") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guides_author_idx" ON "guides_table" USING btree ("author");