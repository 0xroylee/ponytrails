# Ponyrace Skill Design

Date: 2026-06-23

## Goal

Add a bundled `ponyrace` skill that lets an installed agent recognize
`/ponyrace ...` and run the Ponytrail CLI requirement discussion before
implementation.

The skill should make the chat trigger feel native while keeping the CLI as the
source of truth for clarification, role-pony discussion, vote tallying, judge
summary, and the human confirmation gate.

## Approved Approach

Create a separate bundled skill:

```text
bundled-skills/ponyrace/
  SKILL.md
  agents/openai.yaml
```

Users should be able to install it with:

```bash
ponytrail skills install ponyrace
```

This keeps the existing `pony-trail` skill focused on file-change snapshots.
The new `ponyrace` skill focuses only on triggering and respecting the
requirement discussion flow.

## Skill Behavior

The skill should trigger when the user says `/ponyrace`, asks to "run a pony
race", or asks the ponies to discuss whether a requirement direction matches the
request.

When triggered, the agent should:

1. Extract the requirement text after `/ponyrace` or from the user's message.
2. Run the Ponytrail CLI requirement discussion:
   - installed package: `ponytrail ponyrace "<request>"`
   - local repo development: `rtk bun run dev -- ponyrace "<request>"`
3. If a manifest path is needed, use `--manifest <path>` rather than editing
   the request text.
4. Show or summarize the CLI output, preserving the pony discussion, Judge
   summary, approval tally, and pending human confirmation.
5. Wait for explicit human approval before moving toward implementation.

The skill must not bypass the CLI, reimplement voting, or start worker
execution directly.

## Files

Add:

- `bundled-skills/ponyrace/SKILL.md`
- `bundled-skills/ponyrace/agents/openai.yaml`

Update:

- `tests/skill-installer.test.ts`
- `README.md`

No runtime TypeScript changes should be needed if `ponytrail ponyrace` already
exists.

## Testing

Use test-first implementation:

1. Add a failing installer test proving `resolveInstallSkillSource("ponyrace")`
   returns the bundled skill and its `SKILL.md` has `name: ponyrace`.
2. Add a failing installer test proving `ponyrace` installs into at least one
   directory target and Cursor rule target.
3. Add the skill files.
4. Update README skill-install examples to mention `ponyrace`.
5. Run the focused installer tests, then `rtk bun run check`.

## Non-Goals

- Do not change the `ponytrail ponyrace` CLI behavior in this slice.
- Do not merge this behavior into the `pony-trail` snapshot skill.
- Do not add live model calls or a second voting engine.
- Do not allow the skill to start implementation before human approval.
