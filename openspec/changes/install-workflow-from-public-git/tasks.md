# Tasks

## 1. Proposal Approval

- [x] Create OpenSpec proposal, spec delta, and task checklist.
- [x] Review public git workflow-source scope with the human owner.
- [x] Decide whether v1 supports only repository-root workflows or also
      subdirectory sources: support repository roots plus `#path` fragments.
- [x] Decide whether installed records include a resolved commit hash: include
      it when `git rev-parse HEAD` succeeds.
- [x] Decide whether command output mentions git fetches: keep existing install
      output for now.
- [x] Add raw sandbox install verification to the proposal scope.

## 2. Brainstorm Design

- [x] Explore 2-3 source syntax and resolver approaches with trade-offs.
- [x] Confirm the recommended design with the human owner.
- [x] Save the approved design to `docs/superpowers/specs/`.
- [x] Re-review the written design for placeholders, contradictions, and scope
      creep.

## 3. Plan Implementation

- [x] Write the implementation plan in `docs/superpowers/plans/`.
- [x] Include TDD slices for git source parsing, temporary clone lifecycle,
      install/clone integration, validation/dependency commands, docs, and
      smoke checks.
- [x] Include a raw sandbox smoke slice that uses an empty project directory,
      an empty workspace-local `--home`, and a minimal command environment.

## 4. Implement With TDD

- [x] Add a failing runtime test for loading a workflow from a fake public git
      source through an injected command runner.
- [x] Implement minimal git source detection and temporary checkout resolution.
- [x] Add a failing install/clone test proving relative local skill paths
      resolve from the fetched checkout.
- [x] Implement install/clone integration and durable git source metadata.
- [x] Add failing validate/deps tests for public git sources.
- [x] Implement validate/deps cleanup on success and failure.
- [x] Update README and author guide public git examples.
- [x] Add a script or documented smoke command for raw sandbox public git
      install verification.

## 5. Verify And Archive

- [x] Run focused Bun tests for workflow bundles and GetSuperpower commands.
- [x] Run CLI smoke checks against a scratch directory under `work/`.
- [x] Run a raw sandbox install smoke from a fresh `work/` project with a fresh
      `work/` home and minimal environment, then inspect the generated workflow
      record and installed skill files.
- [x] Run `rtk bun run check`.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval.
