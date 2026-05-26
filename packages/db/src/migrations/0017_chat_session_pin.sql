ALTER TABLE chat_sessions
	ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS chat_sessions_workspace_archived_pinned_updated_idx
	ON chat_sessions (workspace_id, archived, pinned DESC, updated_at DESC);
