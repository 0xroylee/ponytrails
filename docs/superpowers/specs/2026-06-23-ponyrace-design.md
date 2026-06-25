# Ponyrace Requirement Discussion Design

Date: 2026-06-23

## Goal

Add `ponyrace` as a clear user-facing trigger for Ponytrail's requirement
discussion flow. A user should be able to ask for a pony race before
implementation so role-specific ponies discuss whether the direction matches the
request, vote on it, and only allow implementation to proceed after the required
approval threshold and human confirmation.

## Approved Approach

Add a first-class CLI command:

```bash
ponytrail ponyrace "add CSV import"
```

The command reuses the existing `goal` requirement-court flow instead of
creating a second decision engine. Also document `/ponyrace` as the
agent-facing trigger phrase for Codex, Claude, or another agent using the
installed Ponytrail skill.

This keeps one source of truth for clarification, requirement drafting,
role-bot discussion, vote tallying, judge summary, and the implementation gate.

## Runtime Behavior

`ponyrace` should run the same lifecycle as `goal`:

- normalize and clarify vague requests before discussion
- draft a requirement contract from the clarified request
- show discussion from the Product Manager, Project Manager, Engineer, and
  Testing ponies
- convert the discussion into votes
- require the manifest decision rule to pass before implementation is allowed
- leave human confirmation pending before worker execution

The default manifest already uses four voting bots and requires three
approvals. That is 75% approval, which satisfies the requested "over 60% pony
agreement" rule. The Judge remains a non-voting summarizer.

## CLI Surface

Add `ponyrace` next to `goal`.

The command should accept:

- `<request...>`: raw user request
- `-m, --manifest <path>`: manifest path, matching `goal`
- `-w, --worker <id>`: accepted for compatibility, with execution still gated
- `--json`: print the same JSON shape as `goal --json`

The non-JSON output should make the trigger feel intentional by using a heading
such as `Pony race` while still printing the same requirement discussion, judge
summary, detailed requirement, and pending human confirmation.

## Agent Trigger

Document `/ponyrace` as the phrase an installed agent skill can recognize:

```text
/ponyrace add CSV import
```

The documented meaning is: run the Ponytrail requirement discussion first,
require the configured pony approval threshold, ask for human confirmation, and
only then continue toward implementation.

## Files

Update:

- `src/cli.ts`
- `tests/cli.test.ts`
- `docs/architecture.md`
- `README.md`

Do not add new runtime modules unless the implementation exposes duplicated
logic that needs a small helper extraction.

## Testing

Use test-first implementation:

1. Add a failing CLI registration test proving `ponyrace` is registered with
   the expected options.
2. Add a failing CLI behavior test proving `ponytrail ponyrace ...` prints the
   pony discussion, Judge summary, detailed requirement, and does not stream a
   worker.
3. Add or update documentation checks only if an existing test already covers
   README or architecture text.
4. Implement the command by reusing the current goal flow.
5. Run the focused CLI tests, then `rtk bun run check`.

## Non-Goals

- Do not build a separate ponyrace voting runtime.
- Do not change the default manifest threshold below the existing 3-of-4 rule.
- Do not make `ponyrace` start worker execution automatically.
- Do not add live model calls; keep the same deterministic runtime behavior as
  the current requirement court.
- Do not rename the existing `goal` command in this slice.
