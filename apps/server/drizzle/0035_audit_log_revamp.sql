ALTER TABLE "audit_log_table" ADD COLUMN "subjects" jsonb;--> statement-breakpoint
ALTER TABLE "audit_log_table" ADD COLUMN "changes" jsonb;--> statement-breakpoint
ALTER TABLE "audit_log_table" ADD COLUMN "items" jsonb;--> statement-breakpoint
ALTER TABLE "audit_log_table" ADD COLUMN "context" jsonb;--> statement-breakpoint
CREATE INDEX "audit_log_subjects_idx" ON "audit_log_table" USING gin ("subjects" jsonb_path_ops);--> statement-breakpoint
ALTER TABLE "audit_log_table" DROP COLUMN "actor_name";