ALTER TYPE "voting_mode" ADD VALUE 'gated';--> statement-breakpoint
CREATE TABLE "ballot_seed" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_id" text NOT NULL,
	"id" text PRIMARY KEY,
	"seed" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "ballot_seed_user_event_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "voting_verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"code" text,
	"email" text NOT NULL,
	"event_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"submission_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"verified" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ballot_seed_event_idx" ON "ballot_seed" ("event_id");--> statement-breakpoint
CREATE INDEX "ballot_seed_user_idx" ON "ballot_seed" ("user_id");--> statement-breakpoint
CREATE INDEX "voting_verification_user_event_idx" ON "voting_verification" ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "voting_verification_email_idx" ON "voting_verification" ("email");--> statement-breakpoint
CREATE INDEX "voting_verification_expires_idx" ON "voting_verification" ("expires_at");--> statement-breakpoint
ALTER TABLE "ballot_seed" ADD CONSTRAINT "ballot_seed_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ballot_seed" ADD CONSTRAINT "ballot_seed_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voting_verification" ADD CONSTRAINT "voting_verification_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voting_verification" ADD CONSTRAINT "voting_verification_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voting_verification" ADD CONSTRAINT "voting_verification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;