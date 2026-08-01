ALTER TABLE "cwl_bonus_table" DROP CONSTRAINT "cwl_bonus_table_discord_user_id_account_account_id_fk";
--> statement-breakpoint
ALTER TABLE "cwl_bonus_table" DROP CONSTRAINT "cwl_bonus_table_coc_account_tag_coc_account_table_coc_account_tag_fk";
--> statement-breakpoint
ALTER TABLE "audit_log_table" DROP COLUMN "api_key_start";