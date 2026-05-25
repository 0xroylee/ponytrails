ALTER TABLE chat_sessions
	ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS chat_sessions_workspace_archived_updated_idx
	ON chat_sessions (workspace_id, archived, updated_at DESC);
