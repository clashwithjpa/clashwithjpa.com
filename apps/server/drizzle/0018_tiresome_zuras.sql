ALTER TABLE "cwl_bonus_table" DROP CONSTRAINT "cwl_bonus_table_coc_account_tag_coc_account_table_coc_account_tag_fk";
--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" DROP CONSTRAINT "cwl_bonus_table_discord_user_id_account_account_id_fk";
--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD CONSTRAINT "cwl_bonus_table_coc_account_tag_coc_account_table_coc_account_tag_fk" FOREIGN KEY ("coc_account_tag") REFERENCES "public"."coc_account_table"("coc_account_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" ADD CONSTRAINT "cwl_bonus_table_discord_user_id_account_account_id_fk" FOREIGN KEY ("discord_user_id") REFERENCES "public"."account"("account_id") ON DELETE no action ON UPDATE no action;