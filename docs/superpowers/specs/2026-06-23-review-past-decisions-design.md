# Review Past Decisions Skill Design

Date: 2026-06-23

## Goal

Add a second bundled Ponytrail skill named `review-past-decisions`. The skill helps an agent inspect prior decision evidence before drafting or revising a new plan, so the next plan carries forward accepted constraints, avoids repeating rejected paths, and names any intentional change in direction.

## Approved Approach

Create a separate installable skill under `bundled-skills/review-past-decisions/`.

This keeps the existing `pony-trail` skill focused on recording file-change snapshots. The new skill focuses on planning-time review and can be installed through the existing `ponytrail skills install <name>` surface.

## Skill Behavior

The skill should tell an agent to use it before proposing a new plan when prior decisions may matter. It should guide the agent to inspect local evidence sources such as:

- `ponytrail history --details`
- `.pony-trail/sessions/<session-id>/tree.md`
- relevant docs, accepted specs, prior plans, or issue notes already present in the workspace

The required output is a short decision carry-forward with:

- decisions to preserve
- constraints that still apply
- rejected or superseded approaches to avoid
- open questions or stale decisions that need user confirmation
- the plan implications for the new work

The skill must not invent history. If no relevant evidence exists, it should say so and continue with a normal plan using current context.

## Files

Add:

- `bundled-skills/review-past-decisions/SKILL.md`
- `bundled-skills/review-past-decisions/agents/openai.yaml`

Update:

- `tests/skill-installer.test.ts`

No helper scripts are needed in the first version.

## Installation Flow

The existing installer already resolves folders under `bundled-skills/<name>` by skill name. After this change, users should be able to run:

```bash
ponytrail skills install review-past-decisions
```

The same installer path should also render a Cursor rule for Cursor targets.

## Testing

Use test-first implementation:

1. Add a failing installer test proving `resolveInstallSkillSource("review-past-decisions")` returns a bundled source whose `SKILL.md` has the expected name.
2. Add a failing installer test proving the skill installs into at least one directory target and one Cursor rule target.
3. Implement the skill files.
4. Run the focused installer tests, then the full `rtk bun run check` gate.

## Non-Goals

- Do not change the runtime manifest court skills in this slice.
- Do not add a summarizer script yet.
- Do not broaden the README unless explicitly requested.
- Do not alter the existing `pony-trail` snapshot skill behavior.
