# Session File Change Snapshot Design

## Goal

Show a session-level file change summary that matches the screenshot pattern:
one card per selected session with edited file count, total additions and
deletions, per-file additions and deletions, and an expandable long file list.

The v1 scope is latest snapshot only. A later run for the same session replaces
the previous snapshot.

## Success Criteria

1. A completed workflow records the latest file-change snapshot for its chat
   session when the workspace has changed files.
2. The snapshot stores total additions, total deletions, changed file count, the
   capture timestamp, and per-file path/addition/deletion rows.
3. The chat session API and realtime session payload expose the snapshot through
   typed contracts.
4. The web session view renders the summary card only when a non-empty snapshot
   exists.
5. Long file lists show the first rows by default and provide a "Show more
   files" affordance.
6. Git-unavailable, non-repository, and empty-diff states do not create noisy UI.

## Architecture

The server owns snapshot capture and persistence. It already computes workspace
git totals for `/api/workspace/environment`; the new implementation should
extract the reusable git numstat parsing into a small server helper that returns
file rows as well as totals.

Chat sessions remain the durable boundary for the UI. The snapshot should be
stored on the chat session record, mapped by the existing chat mappers, parsed
by the web chat response parser, and rendered by the selected session screen.

## Data Model

Add a nullable session field named `fileChangeSnapshot`.

```ts
interface ChatSessionFileChangeSnapshot {
  fileCount: number;
  additions: number;
  deletions: number;
  files: ChatSessionFileChange[];
  capturedAt: string;
}

interface ChatSessionFileChange {
  path: string;
  additions: number;
  deletions: number;
}
```

The database will store this as serialized JSON on `chat_sessions` to avoid a
separate table for v1. Parser code must validate shape and ignore invalid or
empty snapshots rather than throwing away the whole session response.

## Capture Flow

Capture happens when a workflow/run completes for a session. The capture helper
should inspect the associated project workspace folder, run structured git
commands equivalent to staged plus unstaged `diff --numstat`, combine rows by
path, and persist the resulting snapshot through the chat session update path.

The snapshot is skipped when:

1. Git is unavailable.
2. The workspace folder cannot be resolved.
3. The diff has no changed files.
4. Numstat output cannot be parsed into any valid rows.

Binary file rows should count as zero additions and zero deletions, matching the
existing environment summary behavior for `-` values.

## Web UI

Add a focused chat-room component for the file snapshot card. The card renders
inside the selected session transcript area, near other session-level output and
before the composer. It should use the existing dark operational UI style:
compact borders, no shadows, regular or medium text, green additions, red
deletions, and stable row spacing.

Default display:

1. Header: `Edited N files`.
2. Totals: `+A -D`.
3. First three file rows with right-aligned `+a -d`.
4. Expand control: `Show X more files` when more rows exist.

The expanded state stays local to the component and does not need persistence.

## Error Handling

Snapshot capture failures should not fail the workflow completion path. Log the
failure with session and project context, skip the snapshot update, and leave the
existing session state intact.

Web parsing should tolerate `null`, missing, malformed, or empty snapshots. The
UI should render nothing in those cases.

## Tests

Add focused tests in the affected packages:

1. Server helper tests for parsing and combining git numstat rows.
2. Server chat tests for persisting and mapping the nullable snapshot field.
3. Web parser tests for valid, null, malformed, and empty snapshots.
4. Web pure utility tests for visible-row counts and total labels if the UI
   component needs helper logic.

Visible UI verification should use the local web app and browser once the
implementation exists.

## Non-Goals

1. Snapshot history per run.
2. Inline diffs or file contents.
3. Undo/review actions from the screenshot.
4. Live polling of the current workspace diff for old sessions.
