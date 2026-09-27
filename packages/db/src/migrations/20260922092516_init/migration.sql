CREATE TYPE "event_status" AS ENUM('draft', 'registration', 'submission', 'judging', 'results', 'archived');--> statement-breakpoint
CREATE TYPE "voting_mode" AS ENUM('disabled', 'open', 'authenticated');--> statement-breakpoint
CREATE TYPE "assignment_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "submission_status" AS ENUM('draft', 'submitted', 'locked', 'disqualified');--> statement-breakpoint
CREATE TYPE "invitation_status" AS ENUM('pending', 'accepted', 'declined', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('visitor', 'participant', 'judge', 'organizer', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY,
	"actor_id" text,
	"actor_role" text,
	"event_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}',
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"ip_address" text,
	"token" text NOT NULL UNIQUE,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY,
	"submission_id" text NOT NULL,
	"event_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"is_deleted" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"deleted_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_voter_submission_unique" UNIQUE("voter_id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"cover_image_url" text,
	"website_url" text,
	"organizer_id" text NOT NULL,
	"status" "event_status" DEFAULT 'draft'::"event_status" NOT NULL,
	"registration_start_at" timestamp,
	"registration_end_at" timestamp,
	"submission_start_at" timestamp,
	"submission_deadline" timestamp,
	"judging_start_at" timestamp,
	"judging_end_at" timestamp,
	"results_published_at" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"max_team_size" integer DEFAULT 4 NOT NULL,
	"min_team_size" integer DEFAULT 1 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"allow_individuals" boolean DEFAULT true NOT NULL,
	"require_email_verification" boolean DEFAULT false NOT NULL,
	"voting_mode" "voting_mode" DEFAULT 'disabled'::"voting_mode" NOT NULL,
	"voting_results_visible" boolean DEFAULT false NOT NULL,
	"max_votes_per_user" integer DEFAULT 3 NOT NULL,
	"judging_results_visible" boolean DEFAULT false NOT NULL,
	"custom_questions" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_organizer" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"can_manage_judges" boolean DEFAULT true NOT NULL,
	"can_manage_submissions" boolean DEFAULT true NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prize" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"track_id" text,
	"name" text NOT NULL,
	"description" text,
	"value" text,
	"currency" text DEFAULT 'USD',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_submissions" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judge_assignment" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"judge_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"track_id" text,
	"status" "assignment_status" DEFAULT 'pending'::"assignment_status" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "judge_assignment_unique" UNIQUE("judge_id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "result" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"track_id" text,
	"raw_score" numeric(8,4),
	"normalized_score" numeric(8,4),
	"final_score" numeric(8,4),
	"rank" integer,
	"track_rank" integer,
	"score_breakdown" jsonb,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "result_event_submission_unique" UNIQUE("event_id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "rubric" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"track_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_weighted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_criterion" (
	"id" text PRIMARY KEY,
	"rubric_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight" numeric(5,2) NOT NULL,
	"min_score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score" (
	"id" text PRIMARY KEY,
	"assignment_id" text NOT NULL CONSTRAINT "score_assignment_unique" UNIQUE,
	"judge_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"event_id" text NOT NULL,
	"rubric_id" text NOT NULL,
	"criterion_scores" jsonb NOT NULL,
	"total_score" numeric(8,4),
	"feedback" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"team_id" text,
	"submitter_id" text NOT NULL,
	"track_id" text,
	"status" "submission_status" DEFAULT 'draft'::"submission_status" NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"thumbnail_url" text,
	"demo_video_url" text,
	"repository_url" text,
	"live_demo_url" text,
	"tech_tags" jsonb DEFAULT '[]' NOT NULL,
	"gallery_image_urls" jsonb DEFAULT '[]' NOT NULL,
	"custom_answers" jsonb DEFAULT '[]' NOT NULL,
	"submitted_at" timestamp,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submission_team_event_unique" UNIQUE("team_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitation" (
	"id" text PRIMARY KEY,
	"team_id" text NOT NULL,
	"event_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"invited_user_id" text,
	"invited_email" text,
	"token" text NOT NULL UNIQUE,
	"status" "invitation_status" DEFAULT 'pending'::"invitation_status" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY,
	"role" "user_role" DEFAULT 'participant'::"user_role" NOT NULL,
	"bio" text,
	"avatar_url" text,
	"website_url" text,
	"github_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_event_idx" ON "audit_log" ("event_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" ("action");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "comment_submission_idx" ON "comment" ("submission_id");--> statement-breakpoint
CREATE INDEX "comment_author_idx" ON "comment" ("author_id");--> statement-breakpoint
CREATE INDEX "comment_event_idx" ON "comment" ("event_id");--> statement-breakpoint
CREATE INDEX "vote_event_idx" ON "vote" ("event_id");--> statement-breakpoint
CREATE INDEX "vote_submission_idx" ON "vote" ("submission_id");--> statement-breakpoint
CREATE INDEX "vote_voter_event_idx" ON "vote" ("voter_id","event_id");--> statement-breakpoint
CREATE INDEX "event_slug_idx" ON "event" ("slug");--> statement-breakpoint
CREATE INDEX "event_organizer_idx" ON "event" ("organizer_id");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" ("status");--> statement-breakpoint
CREATE INDEX "event_organizer_event_idx" ON "event_organizer" ("event_id");--> statement-breakpoint
CREATE INDEX "event_organizer_user_idx" ON "event_organizer" ("user_id");--> statement-breakpoint
CREATE INDEX "prize_event_idx" ON "prize" ("event_id");--> statement-breakpoint
CREATE INDEX "track_event_idx" ON "track" ("event_id");--> statement-breakpoint
CREATE INDEX "judge_assignment_event_idx" ON "judge_assignment" ("event_id");--> statement-breakpoint
CREATE INDEX "judge_assignment_judge_idx" ON "judge_assignment" ("judge_id");--> statement-breakpoint
CREATE INDEX "judge_assignment_submission_idx" ON "judge_assignment" ("submission_id");--> statement-breakpoint
CREATE INDEX "result_event_idx" ON "result" ("event_id");--> statement-breakpoint
CREATE INDEX "result_rank_idx" ON "result" ("event_id","rank");--> statement-breakpoint
CREATE INDEX "rubric_event_idx" ON "rubric" ("event_id");--> statement-breakpoint
CREATE INDEX "rubric_criterion_rubric_idx" ON "rubric_criterion" ("rubric_id");--> statement-breakpoint
CREATE INDEX "score_judge_idx" ON "score" ("judge_id");--> statement-breakpoint
CREATE INDEX "score_submission_idx" ON "score" ("submission_id");--> statement-breakpoint
CREATE INDEX "score_event_idx" ON "score" ("event_id");--> statement-breakpoint
CREATE INDEX "submission_event_idx" ON "submission" ("event_id");--> statement-breakpoint
CREATE INDEX "submission_team_idx" ON "submission" ("team_id");--> statement-breakpoint
CREATE INDEX "submission_submitter_idx" ON "submission" ("submitter_id");--> statement-breakpoint
CREATE INDEX "submission_track_idx" ON "submission" ("track_id");--> statement-breakpoint
CREATE INDEX "submission_status_idx" ON "submission" ("status");--> statement-breakpoint
CREATE INDEX "team_event_idx" ON "team" ("event_id");--> statement-breakpoint
CREATE INDEX "team_owner_idx" ON "team" ("owner_id");--> statement-breakpoint
CREATE INDEX "team_invitation_team_idx" ON "team_invitation" ("team_id");--> statement-breakpoint
CREATE INDEX "team_invitation_token_idx" ON "team_invitation" ("token");--> statement-breakpoint
CREATE INDEX "team_invitation_invited_user_idx" ON "team_invitation" ("invited_user_id");--> statement-breakpoint
CREATE INDEX "team_member_team_idx" ON "team_member" ("team_id");--> statement-breakpoint
CREATE INDEX "team_member_user_idx" ON "team_member" ("user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_organizer" ADD CONSTRAINT "event_organizer_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prize" ADD CONSTRAINT "prize_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prize" ADD CONSTRAINT "prize_track_id_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "track" ADD CONSTRAINT "track_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "judge_assignment" ADD CONSTRAINT "judge_assignment_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "judge_assignment" ADD CONSTRAINT "judge_assignment_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "judge_assignment" ADD CONSTRAINT "judge_assignment_track_id_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "result" ADD CONSTRAINT "result_track_id_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rubric" ADD CONSTRAINT "rubric_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rubric" ADD CONSTRAINT "rubric_track_id_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rubric_criterion" ADD CONSTRAINT "rubric_criterion_rubric_id_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "rubric"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_assignment_id_judge_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "judge_assignment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_submission_id_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_rubric_id_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "rubric"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_track_id_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_event_id_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;