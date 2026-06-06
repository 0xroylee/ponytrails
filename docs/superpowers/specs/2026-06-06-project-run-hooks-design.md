# Project Run Hooks Design

## Summary

Add project-level workflow hooks that operators can edit from the web UI:

- `preHookScript`: runs once before a project workflow starts.
- `afterHookScript`: runs once after a project workflow attempt finishes.

Hooks are script blocks owned by the project record. They are intended for
project setup, install, cleanup, sync, and reporting steps that differ between
repositories.

## Goals

- Let operators configure project-specific setup and post-run scripts in the
  existing Projects create/edit flow.
- Persist hook scripts with the project record so each project can define its
  own install or cleanup behavior.
- Feed hook scripts into CLI workflow runtime through the existing server
  project metadata overlay.
- Run hooks from the project execution path so scripts naturally operate inside
  the selected repository or local folder.
- Keep hook failure semantics simple and predictable.

## Non-Goals

- No per-phase hooks for brainstorm, plan, implement, or testing.
- No global hooks in `/settings`.
- No named hook library or hook history table.
- No shell-string construction in workflow orchestration code.

## Data Model And API

Add nullable text columns to `board_projects`:

- `pre_hook_script`
- `after_hook_script`

Expose those fields as camelCase project record properties:

- `preHookScript`
- `afterHookScript`

The fields are included in project create, update, list, and read responses.
Whitespace-only scripts are normalized to `null` before persistence.

The CLI project metadata overlay already fetches `/api/projects` and applies
server-owned project fields to resolved project configs. Extend that overlay so
`preHookScript` and `afterHookScript` become part of `ResolvedProjectConfig`.

## Web UI

The existing project create/edit dialog gets a "Hooks" section below repository
details. It contains two script textareas:

- "Before workflow" for `preHookScript`
- "After workflow" for `afterHookScript`

The controls stay inside the current project dialog and follow the dark operator
UI style. The UI does not create a separate settings page for hooks.

## Runtime Behavior

Hooks execute as project-level workflow hooks:

1. Resolve project config.
2. Prepare the execution workspace or isolated worktree when applicable.
3. Run `preHookScript` if present.
4. Start the workflow pipeline only if the pre-hook succeeds.
5. After the workflow attempt completes or fails, run `afterHookScript` if
   present from a `finally` path.

Each hook runs with `cwd = project.executionPath`.

To avoid raw shell command construction, workflow code writes the script body to
a temporary file and invokes it with structured argv, for example:

```text
sh <temp-script-path>
```

Hook execution should reuse the existing prep-command timeout pattern unless
implementation finds a narrower local helper is cleaner.

## Failure Semantics

Pre-hook failure blocks the workflow:

- A nonzero pre-hook exit marks the workflow attempt failed.
- The failure reason includes hook output so the operator can diagnose setup
  problems.
- The agent pipeline does not start.

After-hook failure is recorded but does not rewrite the workflow result:

- A nonzero after-hook exit is logged or recorded as a post-run hook failure.
- A successful workflow remains successful even if the after-hook fails.
- A failed workflow remains failed for its original reason, with the after-hook
  failure attached as additional context.

Empty hook scripts are disabled.

## Testing And Verification

Server tests cover project create, update, list, and read payloads for both hook
fields.

Web API and utility tests cover project record parsing and create/update request
construction.

CLI tests cover:

- Server project metadata overlay mapping hook fields into resolved config.
- Pre-hook execution before the workflow pipeline.
- Pre-hook failure blocking the workflow.
- After-hook execution after the workflow attempt.
- After-hook failure being recorded without changing a successful workflow
  result.

Database package checks cover the schema and migration changes. Visible UI
changes are verified with web typecheck/build and browser inspection of the
project create/edit dialog.

## Success Criteria

- A project can be created or edited with before/after hook scripts from the web
  UI.
- Saved hooks survive reload and appear in project API responses.
- The CLI receives hook scripts through existing project metadata resolution.
- A setup hook can install or prepare a project before agent work starts.
- A failing setup hook prevents the agent workflow from running.
- A failing after hook is visible but does not mask the actual workflow result.
