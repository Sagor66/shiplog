-- Partial indexes for hot read paths. See prisma/sql/partial_indexes.sql for rationale.

CREATE INDEX IF NOT EXISTS "idx_projects_workspace"
  ON "projects" ("workspace_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_changelogs_project_published"
  ON "changelogs" ("project_id", "published_at" DESC)
  WHERE "status" = 'published';

CREATE INDEX IF NOT EXISTS "idx_email_subscribers_project"
  ON "email_subscribers" ("project_id")
  WHERE "unsubscribed_at" IS NULL;
