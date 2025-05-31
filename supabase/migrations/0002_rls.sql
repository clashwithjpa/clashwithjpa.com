ALTER TABLE "cwl_applications" ADD CONSTRAINT "cwl_applications_assigned_clan_fkey" FOREIGN KEY ("assigned_clan") REFERENCES "public"."cwl_clans"("clan_tag") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "coc_accounts" ADD CONSTRAINT "coc_accounts_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "public"."users"("discord_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "join_applications" ADD CONSTRAINT "join_applications_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "public"."users"("discord_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE POLICY "Enable all for users based on discord_id" ON "users" AS PERMISSIVE FOR ALL TO "authenticated" USING (discord_id = current_discord_id()) WITH CHECK (discord_id = current_discord_id());
--> statement-breakpoint

CREATE POLICY "Enable all for admin or user_manager" ON "users" AS PERMISSIVE FOR ALL TO "authenticated";
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated";
--> statement-breakpoint


CREATE POLICY "Enable all for admin or base_manager" ON "bases" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text, 'base_manager'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text, 'base_manager'::text]));
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "bases" AS PERMISSIVE FOR SELECT TO public;
--> statement-breakpoint

CREATE POLICY "Enable all for admin or clan_manager" ON "cwl_clans" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text, 'clan_manager'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text, 'clan_manager'::text]));
--> statement-breakpoint

CREATE POLICY "Enable select for authenticated users" ON "cwl_clans" AS PERMISSIVE FOR SELECT TO "authenticated";
--> statement-breakpoint

CREATE POLICY "Enable all for admin or clan_manager" ON "clans" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text, 'clan_manager'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text, 'clan_manager'::text]));
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "clans" AS PERMISSIVE FOR SELECT TO public;
--> statement-breakpoint

CREATE POLICY "Enable all for admin or cwl_manager" ON "cwl_applications" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text, 'cwl_manager'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text, 'cwl_manager'::text]));
--> statement-breakpoint

CREATE POLICY "Enable all for users based on discord_id" ON "cwl_applications" AS PERMISSIVE FOR ALL TO "authenticated" USING (discord_id = current_discord_id()) WITH CHECK (discord_id = current_discord_id());
--> statement-breakpoint

CREATE POLICY "Enable all for admin" ON "user_roles" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text]));
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "user_roles" AS PERMISSIVE FOR SELECT TO public;
--> statement-breakpoint

CREATE POLICY "Enable all for users based on discord_id" ON "coc_accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING (discord_id = current_discord_id()) WITH CHECK (discord_id = current_discord_id());
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "coc_accounts" AS PERMISSIVE FOR SELECT TO "authenticated";
--> statement-breakpoint

CREATE POLICY "Enable all for admin or coc_account_manager or user_manager" ON "coc_accounts" AS PERMISSIVE FOR ALL TO "authenticated";
--> statement-breakpoint

CREATE POLICY "Enable all for users based on discord_id" ON "join_applications" AS PERMISSIVE FOR ALL TO "authenticated" USING (discord_id = current_discord_id()) WITH CHECK (discord_id = current_discord_id());
--> statement-breakpoint

CREATE POLICY "Enable all for admin or join_manager" ON "join_applications" AS PERMISSIVE FOR ALL TO "authenticated";
--> statement-breakpoint

CREATE POLICY "Enable all for admin or setting_manager" ON "settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_any_role(ARRAY['admin'::text, 'setting_manager'::text])) WITH CHECK (has_any_role(ARRAY['admin'::text, 'setting_manager'::text]));
--> statement-breakpoint

CREATE POLICY "Enable read access for all users" ON "settings" AS PERMISSIVE FOR SELECT TO public;
--> statement-breakpoint
