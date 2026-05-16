-- Partial indexes that Prisma's schema language can't express directly.
-- Apply these AFTER `prisma migrate dev --name init` by creating an empty
-- follow-up migration and pasting this in:
--
--   pnpm --filter database prisma migrate dev --create-only --name add_partial_indexes
--   # then copy this file's contents into the generated migration.sql
--   pnpm --filter database prisma migrate dev
--
-- All three target the hot path: rows that are NOT soft-deleted /
-- unsubscribed, and changelogs that ARE published. Splitting them off as
-- partials keeps the indexes small and cache-friendly.

CREATE INDEX IF NOT EXISTS "idx_projects_workspace"
  ON "projects" ("workspace_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_changelogs_project_published"
  ON "changelogs" ("project_id", "published_at" DESC)
  WHERE "status" = 'published';

CREATE INDEX IF NOT EXISTS "idx_email_subscribers_project"
  ON "email_subscribers" ("project_id")
  WHERE "unsubscribed_at" IS NULL;
