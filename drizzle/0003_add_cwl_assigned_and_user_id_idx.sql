CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cwl_application_assigned_to_idx" ON "cwl_application_table" USING btree ("assigned_to");