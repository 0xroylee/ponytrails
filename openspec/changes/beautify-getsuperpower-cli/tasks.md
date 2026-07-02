# Tasks

## 1. Proposal Approval

- [x] Create OpenSpec proposal, spec delta, and task checklist.
- [x] Review CLI styling scope with the human owner.
- [x] Decide whether the style guide path is
      `docs/getsuperpower-cli-design.md` or root `design.md`.
- [x] Decide whether the ASCII logo appears only in root help or also after
      successful installs.
- [x] Decide whether no-command invocation should show the welcome help.

## 2. Brainstorm Design

- [x] Explore 2-3 CLI style approaches with trade-offs.
- [x] Confirm the recommended design with the human owner.
- [x] Save the approved design to the chosen design doc path.
- [x] Re-review the written design for placeholders, contradictions, and scope
      creep.

## 3. Plan Implementation

- [x] Write the implementation plan in `docs/superpowers/plans/`.
- [x] Include TDD slices for root help, theme helpers, command output reuse,
      docs, smoke checks, and no-command behavior if approved.

## 4. Implement With TDD

- [x] Add a failing root help test that asserts stripped-ANSI logo, welcome
      message, examples, and current command list.
- [x] Implement the minimal CLI theme helper and root help customization.
- [x] Add focused output tests for install/validate/deps/list/skills/onboard
      formatting.
- [x] Route command output through the theme helper without changing command
      semantics.
- [x] Add or update the CLI style guide document.

## 5. Verify And Archive

- [x] Run focused Bun tests for CLI and GetSuperpower commands.
- [x] Run CLI smoke checks against a scratch directory under `work/`.
- [x] Run `rtk bun run check`.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval.
