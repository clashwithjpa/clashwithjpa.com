-- Rows left behind by keys revoked before the constraint existed. Postgres
-- validates the FK against existing data, so these have to go first.
DELETE FROM "api_key_usage_table" u WHERE NOT EXISTS (SELECT 1 FROM "apikey" k WHERE k."id" = u."key_id");
--> statement-breakpoint
ALTER TABLE "api_key_usage_table" ADD CONSTRAINT "api_key_usage_table_key_id_apikey_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."apikey"("id") ON DELETE cascade ON UPDATE no action;
