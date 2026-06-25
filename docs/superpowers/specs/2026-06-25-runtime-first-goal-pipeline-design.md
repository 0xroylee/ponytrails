# Runtime-First Goal Pipeline Design

## Context

The `goal` command should become the default preparation pipeline for a
requirement-first Ponytrail flow. The command should always run human-facing
brainstorming before pony discussion, ask the human to approve the drafted goal,
then run the requirement court against that approved draft. After the court
approves the direction, the command should print a clear handoff that the goal
is ready for the `superpowers:writing-plans` skill. It should not create the
implementation plan itself.

This design keeps lifecycle rules in `src/runtimes/ponytrail/` and keeps
`src/cli.ts` as the terminal prompt and display shell.

## Goals

- Make adaptive brainstorming part of every `goal` command run.
- Ask interactive CLI questions by default when a TTY is available.
- Draft a goal contract from the raw request plus brainstorm answers.
- Ask the human to approve the drafted goal before any pony discussion starts.
- Run requirement court discussion only after the human approves the goal draft.
- End successful court runs with a ready-for-writing-plans handoff.
- For JSON and non-interactive runs, skip prompts and return a structured
  pending state instead of failing.

## Non-Goals

- Do not create the writing-plan file automatically from `goal`.
- Do not introduce persisted goal sessions under `.ponyrace/goals/` in this
  change.
- Do not move process spawning or worker execution into `src/cli.ts`.
- Do not change the requirement court voter model or approval threshold.

## Architecture

The `goal` command should call a runtime-owned preparation pipeline rather than
stitching the lifecycle together in `src/cli.ts`.

```text
raw request
-> adaptive requirements brainstorm
-> interactive human answers if available
-> draft goal contract
-> human approves drafted goal
-> requirement court discussion and vote
-> ready-for-writing-plans handoff
```

`src/runtimes/ponytrail/brainstorm.ts` should own adaptive question generation
and request normalization. A small runtime orchestration module, such as
`src/runtimes/ponytrail/goal-flow.ts`, should own the state transitions between
brainstorming, draft approval, court discussion, and writing-plans readiness.

`src/cli.ts` remains responsible for Clack prompts, terminal output, JSON
serialization, and wiring injected runners. It should not decide whether the
court is allowed to run.

## Components

### `src/runtimes/ponytrail/brainstorm.ts`

This module should always evaluate the raw request and return adaptive
brainstorm questions. Clear requests may receive fewer follow-ups, but the phase
still exists. Question generation should cover outcome, scope, and evidence when
those dimensions are missing or weak.

### `src/runtimes/ponytrail/goal.ts`

This module continues to own `GoalContract` and `draftGoalContract`. The drafted
goal should include the clarified request produced from the raw request and
brainstorm answers. Open brainstorm questions should remain visible on the
contract when the human chooses not to answer them.

### `src/runtimes/ponytrail/goal-flow.ts`

This new runtime module should coordinate the preparation lifecycle with
structured states:

- `needs_brainstorm_input`
- `goal_approval_pending`
- `goal_rejected`
- `ready_for_discussion`
- `ready_for_writing_plans`

The module should expose pure or mostly pure functions that the CLI can call
between prompts. Requirement court execution can remain in
`runRequirementCourt`, but the goal-flow module should make the approval gate
explicit before that call.

### `src/cli.ts`

The CLI should:

- Load the manifest and active pony runner.
- Ask adaptive brainstorm questions when interactive.
- Render the drafted goal contract.
- Ask for human approval before pony discussion.
- Skip prompts for JSON and non-TTY runs.
- Print the court result and a final ready-for-writing-plans handoff.

## Data Flow

Interactive `goal "..."`:

```text
1. CLI loads the manifest.
2. CLI passes the raw request to the runtime goal pipeline.
3. Runtime returns adaptive brainstorm questions.
4. CLI asks those questions with Clack.
5. Runtime merges the raw request and answers into a goal draft.
6. CLI displays the draft goal contract.
7. CLI asks the human to approve the goal draft.
8. If approved, CLI calls the runtime court flow.
9. Requirement court discusses and votes on the approved draft.
10. CLI prints the court result and ready-for-writing-plans handoff.
```

JSON and non-interactive runs:

```text
1. Runtime computes brainstorm questions and the next pending state.
2. CLI does not prompt.
3. Output includes pending human approval metadata.
4. Requirement court does not run without an approved draft.
```

If the human skips all brainstorm questions but approves the draft, the court may
run. The human approval is the intentional lock.

## Error Handling

- If the user cancels brainstorming, stop before drafting and report that goal
  brainstorming was cancelled.
- If all brainstorm questions are left open, draft from the raw request and keep
  open questions visible in the contract.
- If the user rejects the drafted goal, stop before pony discussion and report
  that the goal is paused.
- If the runtime cannot produce a useful draft, return a structured pending
  state with brainstorm questions.
- If a pony runner is missing, keep the existing requirement court error:
  requirement court requires an explicit pony runner.

## JSON And Non-Interactive Behavior

`--json contract`, `--json court`, and non-TTY runs should skip interactive
prompts. They should serialize the current structured state instead of failing.
When human approval has not happened, the serialized state should include a
pending marker such as `humanGoalApproval: "pending"` and should not run the
requirement court.

## Testing

Runtime brainstorm tests should cover:

- Adaptive questions are evaluated for every request.
- Clear requests receive targeted follow-ups rather than the full vague-request
  checklist.
- Vague requests receive outcome, scope, and evidence questions.
- Brainstorm answers merge into the normalized clarified request.

Runtime goal-flow tests should cover:

- The pipeline returns a pending brainstorm state before prompts.
- The pipeline produces a draft after answers are supplied.
- Human approval is required before discussion.
- Rejected goals do not run requirement court.
- A court-approved goal returns `ready_for_writing_plans`.

CLI tests should cover:

- Interactive `goal` calls the clarification prompter.
- Interactive `goal` asks for draft approval before `runRequirementCourt`.
- Rejected drafts do not run requirement court.
- JSON and non-TTY runs serialize a pending state instead of prompting.

Final verification should run:

```bash
rtk bun run check
```

For CLI smoke after implementation:

```bash
rtk bun run dev -- goal "add adaptive goal brainstorming"
rtk bun run dev -- goal "add adaptive goal brainstorming" --json contract
```
