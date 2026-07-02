# Tasks

## 1. Proposal Approval

- [x] Create OpenSpec proposal, spec delta, and task checklist.
- [x] Review onboard command scope with the human owner.
- [x] Decide whether RTK setup is executable in v1 or printed as exact
      instructions: print exact instructions when RTK is missing.
- [x] Decide whether `onboard` accepts `--dir <dir>`: include `--dir <dir>`.
- [x] Decide whether v1 includes a `--yes` non-interactive mode: keep v1 fully
      interactive without `--yes`.

## 2. Brainstorm Design

- [x] Explore 2-3 onboard flow approaches with trade-offs.
- [x] Confirm the recommended design with the human owner.
- [x] Save the approved design to `docs/superpowers/specs/`.
- [x] Re-review the written design for placeholders, contradictions, and scope
      creep.

## 3. Plan Implementation

- [x] Write the implementation plan in `docs/superpowers/plans/`.
- [x] Include TDD slices for command registration, prompt branching, RTK checks,
      CodeGraph checks, confirmed indexing, failure messages, and smoke checks.

## 4. Implement With TDD

- [x] Confirm the public seams under test before writing tests.
- [x] Add a failing command-registration test for root `onboard`.
- [x] Implement minimal root command registration.
- [x] Add a failing prompt-branching test for skipped RTK and CodeGraph steps.
- [x] Implement injectable prompt handling and step status output.
- [x] Add failing tests for already-ready RTK and CodeGraph states.
- [x] Implement RTK and CodeGraph readiness checks.
- [x] Add a failing test for confirmed CodeGraph indexing through an injected
      command runner.
- [x] Implement confirmed CodeGraph indexing.
- [x] Add a failing test for setup command failures.
- [x] Implement clear step-specific failure messages.
- [x] Update docs or help copy only where the command surface requires it.

## 5. Verify And Archive

- [x] Run focused Bun tests for GetSuperpower command registration and onboard
      flow behavior.
- [x] Run CLI smoke checks against a scratch directory under `work/`.
- [x] Run `rtk bun run check`.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval.
