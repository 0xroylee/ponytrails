# Advanced Requirement-Court Skills Design

## Context

Ponyrace already has a manifest-driven requirement court where voting bots use
file-backed skills from `src/skills/requirement-court/`. The current shared
skills are useful primitives: intent alignment, scope control, feasibility
review, verification design, risk review, and goal rewrite.

The user approved a deeper design for the four default review perspectives:
Product Manager, Project Manager, Senior Engineer, and Testing. These skills
should make each bot think harder about the goal, the proposed change, the
effects, security, cost, and perspective-specific risks before approving a
requirement direction.

## Goals

- Add role-specific review skills that preserve clear bot perspectives instead
  of flattening all review behavior into generic risk and scope checks.
- Keep the skills concise enough to fit inside requirement prompts while still
  forcing deeper visible rationale.
- Wire default setup ponies to these skills so custom setup manifests get the
  stronger review lenses by default.
- Keep existing shared skills as composable primitives for older manifests and
  generic bot configurations.
- Add focused tests that prove the new skills load into the registry, manifest
  bots reference them, and local pony responses surface the deeper guidance.

## Non-Goals

- Do not replace Superpowers brainstorming or writing-plans gates.
- Do not start worker implementation automatically after a requirement race.
- Do not add model-provider-specific behavior to the core runtime.
- Do not create separate external Codex skill folders for these role lenses.
  They belong to Ponyrace's internal requirement-court skill registry.
- Do not broaden the CLI surface unless tests show a necessary manifest loading
  gap.

## Design

### Skill Files

Create four new requirement-court skill folders:

- `src/skills/requirement-court/product-management-review/SKILL.md`
- `src/skills/requirement-court/project-management-review/SKILL.md`
- `src/skills/requirement-court/senior-engineering-review/SKILL.md`
- `src/skills/requirement-court/testing-review/SKILL.md`

Each file uses the existing internal skill frontmatter shape:

```yaml
---
id: product_management_review
displayName: Product Management Review
description: Evaluate product intent, user value, scope trade-offs, success signals, and product risk before approving a requirement direction.
---
```

The body should be imperative and compact. Each role should require visible
rationale across five dimensions:

- user's goal and intended outcome
- proposed change and scope boundary
- downstream effect on users, operators, maintainers, or delivery
- security, privacy, cost, or operational risk relevant to the role
- required amendment when the role cannot verify a safe direction

### Registry

Extend `DefaultRequirementCourtSkillId` and
`DEFAULT_REQUIREMENT_COURT_SKILL_FOLDERS` in
`src/skills/requirement-court/index.ts`. Keep all existing skill ids stable.

### Manifest Wiring

Update default review bot skill lists in
`src/runtimes/ponytrail/manifest.ts`:

- `product_manager_bot`: add `product_management_review`
- `project_manager_bot`: add `project_management_review`
- `engineer_bot`: keep compatibility for the older default court, but add
  `senior_engineering_review`
- `testing_bot`: add `testing_review`

Update `createDefaultSetupReviewBots()` so generated setup manifests use
`senior_engineer_bot` with the advanced senior engineering instruction and role
skill. The setup path already supports generic voter ids, including
`senior_engineer_bot`.

### Prompt Behavior

No prompt-builder rewrite is required. `buildRequirementPonyPrompt()` already
renders every configured manifest skill with description and instruction. The
advanced skills should therefore change behavior through data, not through a new
prompt path.

The local pony runner should naturally include the new skill instructions in
its `Skills used` summaries. If a focused test reveals role-specific broad
codebase review copy still names only shallow behavior, update the local helper
message text without changing the runner contract.

## Skill Content Shape

### Product Management Review

Require the bot to test the requirement against the user's real objective,
target user, expected value, success signal, scope trade-off, opportunity cost,
and product risk. It should amend when the direction optimizes for a different
outcome, hides a product decision inside implementation details, or lacks a
measurable success signal.

### Project Management Review

Require the bot to test whether the work can be sequenced, assigned, tracked,
and safely delivered. It should consider dependencies, cross-team or external
system gates, cost of delay, rollout order, rollback needs, and whether the
slice is too broad for one implementation plan.

### Senior Engineering Review

Require the bot to test architecture fit, module boundaries, data contracts,
security, privacy, dependency age, runtime cost, observability, operational
blast radius, and maintainability. It should amend when the requirement implies
unstated credentials, live external writes, destructive changes, hidden
migrations, or large architectural choices.

### Testing Review

Require the bot to turn success into falsifiable evidence. It should consider
acceptance criteria, negative cases, regression surfaces, smoke checks, fixture
data, screenshots or artifacts when relevant, and whether the evidence could
pass while the user's request remains unsatisfied.

## Verification

- Add or update tests around `loadDefaultRequirementCourtSkills()` to prove all
  four advanced role skills load with stable ids and non-empty instructions.
- Add or update manifest tests to prove default and setup manifests reference
  the advanced role skills.
- Add or update requirement-court tests to prove local pony discussion includes
  the advanced role skill names or instructions.
- Run the full repo gate with `rtk bun run check`.
- For CLI-relevant behavior, smoke a requirement discussion from a scratch
  directory under `work/` if manifest loading or CLI output changes.

## Risks

- Prompt bloat: keep each skill body compact and imperative.
- Compatibility drift: keep existing shared skill ids and the older
  `engineer_bot` id stable.
- Shallow local output: ensure tests assert the new skill guidance appears in
  visible discussion, not only in the registry.
- Dirty worktree risk: stage and commit only files created or changed for this
  design, leaving unrelated current edits untouched.
