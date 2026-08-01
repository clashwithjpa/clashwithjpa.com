-- Keys whose owner was deleted before the constraint existed. Postgres
-- validates the FK against existing data, so these have to go first. Nothing is
-- lost: a key with no owner is already refused on every request.
DELETE FROM "apikey" a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = a."reference_id");
--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_reference_id_user_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
