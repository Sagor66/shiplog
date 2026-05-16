-- CreateEnum
CREATE TYPE "plan" AS ENUM ('free', 'pro', 'scale');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('user', 'org');

-- CreateEnum
CREATE TYPE "brand_tone" AS ENUM ('professional', 'friendly', 'witty', 'excited');

-- CreateEnum
CREATE TYPE "item_category" AS ENUM ('feature', 'improvement', 'fix', 'breaking');

-- CreateEnum
CREATE TYPE "item_status" AS ENUM ('draft', 'grouped', 'published', 'discarded');

-- CreateEnum
CREATE TYPE "changelog_status" AS ENUM ('draft', 'scheduled', 'published');

-- CreateEnum
CREATE TYPE "ai_purpose" AS ENUM ('draft_generation', 'regenerate', 'audience_variant', 'social_variant');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "plan" "plan" NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "trial_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "role" NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_installations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "installation_id" BIGINT NOT NULL,
    "account_type" "account_type" NOT NULL,
    "account_login" TEXT NOT NULL,
    "account_id" BIGINT NOT NULL,
    "target_id" BIGINT NOT NULL,
    "repositories_count" INTEGER NOT NULL DEFAULT 0,
    "installed_by_user_id" UUID,
    "installed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "github_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "github_repo_id" BIGINT NOT NULL,
    "github_repo_name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "custom_domain" TEXT,
    "widget_token" TEXT NOT NULL,
    "brand_voice_context" TEXT,
    "brand_tone" "brand_tone" NOT NULL DEFAULT 'professional',
    "brand_description" TEXT,
    "logo_url" TEXT,
    "accent_color" TEXT,
    "email_from_name" TEXT,
    "email_reply_to" TEXT,
    "auto_publish" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_settings" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "auto_capture_screenshots" BOOLEAN NOT NULL DEFAULT false,
    "enabled_channels" JSONB NOT NULL DEFAULT '{"page":true,"email":true,"widget":true,"social":false}',
    "enabled_audiences" JSONB NOT NULL DEFAULT '{"customer":true,"developer":false,"executive":false}',
    "auto_post_x_handle" TEXT,
    "slack_webhook_url" TEXT,
    "excluded_pr_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_pr_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "changelog_id" UUID,
    "theme" TEXT,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "item_category" NOT NULL DEFAULT 'feature',
    "audience_variants" JSONB,
    "source_pr_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "source_pr_data" JSONB,
    "ai_raw_output" JSONB,
    "ai_model" TEXT,
    "ai_generation_id" UUID,
    "screenshot_url" TEXT,
    "status" "item_status" NOT NULL DEFAULT 'draft',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "last_edited_by" UUID,
    "last_edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "changelog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelogs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "version" TEXT,
    "status" "changelog_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "scheduled_for" TIMESTAMPTZ(6),
    "og_image_url" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_by" UUID,
    "channels_published" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "changelogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog_item_versions" (
    "id" UUID NOT NULL,
    "changelog_item_id" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "edited_by" UUID,
    "edit_distance" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "changelog_item_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_token" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "unsubscribed_at" TIMESTAMPTZ(6),
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sends" (
    "id" UUID NOT NULL,
    "changelog_id" UUID NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resend_batch_id" TEXT,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "cost_usd_cents" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "purpose" "ai_purpose" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_views" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "changelog_id" UUID,
    "visitor_hash" TEXT NOT NULL,
    "country_code" CHAR(2),
    "referrer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "widget_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "changelog_id" UUID,
    "visitor_hash" TEXT NOT NULL,
    "country_code" CHAR(2),
    "referrer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_webhook_events" (
    "id" UUID NOT NULL,
    "installation_id" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_stripe_customer_id_key" ON "workspaces"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_stripe_subscription_id_key" ON "workspaces"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_installation_id_key" ON "github_installations"("installation_id");

-- CreateIndex
CREATE INDEX "github_installations_workspace_id_idx" ON "github_installations"("workspace_id");

-- CreateIndex
CREATE INDEX "github_installations_account_id_idx" ON "github_installations"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_custom_domain_key" ON "projects"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "projects_widget_token_key" ON "projects"("widget_token");

-- CreateIndex
CREATE INDEX "projects_installation_id_idx" ON "projects"("installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_slug_key" ON "projects"("workspace_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "project_settings"("project_id");

-- CreateIndex
CREATE INDEX "changelog_items_project_id_status_idx" ON "changelog_items"("project_id", "status");

-- CreateIndex
CREATE INDEX "changelog_items_changelog_id_position_idx" ON "changelog_items"("changelog_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "changelogs_project_id_slug_key" ON "changelogs"("project_id", "slug");

-- CreateIndex
CREATE INDEX "changelog_item_versions_changelog_item_id_created_at_idx" ON "changelog_item_versions"("changelog_item_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_confirmation_token_key" ON "email_subscribers"("confirmation_token");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_project_id_email_key" ON "email_subscribers"("project_id", "email");

-- CreateIndex
CREATE INDEX "email_sends_changelog_id_idx" ON "email_sends"("changelog_id");

-- CreateIndex
CREATE INDEX "ai_generations_project_id_created_at_idx" ON "ai_generations"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "widget_views_project_id_created_at_idx" ON "widget_views"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "widget_views_changelog_id_idx" ON "widget_views"("changelog_id");

-- CreateIndex
CREATE INDEX "page_views_project_id_created_at_idx" ON "page_views"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "page_views_changelog_id_idx" ON "page_views"("changelog_id");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_webhook_events_delivery_id_key" ON "github_webhook_events"("delivery_id");

-- CreateIndex
CREATE INDEX "github_webhook_events_installation_id_idx" ON "github_webhook_events"("installation_id");

-- CreateIndex
CREATE INDEX "github_webhook_events_event_type_idx" ON "github_webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "github_webhook_events_processed_at_idx" ON "github_webhook_events"("processed_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_installed_by_user_id_fkey" FOREIGN KEY ("installed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "github_installations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_changelog_id_fkey" FOREIGN KEY ("changelog_id") REFERENCES "changelogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_ai_generation_id_fkey" FOREIGN KEY ("ai_generation_id") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_item_versions" ADD CONSTRAINT "changelog_item_versions_changelog_item_id_fkey" FOREIGN KEY ("changelog_item_id") REFERENCES "changelog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_item_versions" ADD CONSTRAINT "changelog_item_versions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_subscribers" ADD CONSTRAINT "email_subscribers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_changelog_id_fkey" FOREIGN KEY ("changelog_id") REFERENCES "changelogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_views" ADD CONSTRAINT "widget_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_views" ADD CONSTRAINT "widget_views_changelog_id_fkey" FOREIGN KEY ("changelog_id") REFERENCES "changelogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_changelog_id_fkey" FOREIGN KEY ("changelog_id") REFERENCES "changelogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
