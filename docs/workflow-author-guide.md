# Create Your Own Workflow Bundle

This guide shows the shortest path from an idea to a workflow bundle that other
Ponyrace users can install.

Command note:

- In a cloned Ponyrace repo, use `bun run dev -- <command>`.
- In another project, use `npx ponyrace <command>`.

## 1. Pick One Job

Start with one repeatable workflow, not a whole operating system.

Good examples:

- `support-triage`: classify a support issue, plan a fix, record evidence
- `release-review`: review release risk before implementation
- `bugfix-with-tests`: clarify a bug, plan the fix, verify regression coverage

Use a lowercase name with hyphens:

```text
support-triage
```

## 2. Create The Bundle

From the repo root:

```bash
bun run dev -- bundle init support-triage --dir examples/workflows
```

This creates:

```text
examples/workflows/support-triage/
  workflow.json
  README.md
  skills/
    custom-review/
      SKILL.md
```

## 3. Edit `workflow.json`

Open `examples/workflows/support-triage/workflow.json`.

Each workflow has two important lists:

- `skills`: the skills the workflow needs
- `steps`: the order a user or agent should follow

Example:

```json
{
  "schemaVersion": "0.1",
  "name": "support-triage",
  "version": "0.1.0",
  "description": "Clarify, review, plan, and preserve evidence for support fixes.",
  "skills": [
    { "source": "superpowers:brainstorming" },
    { "source": "./skills/support-review" },
    { "source": "superpowers:writing-plans" },
    { "source": "pony-trail" }
  ],
  "steps": [
    {
      "id": "shape",
      "title": "Clarify the support issue",
      "skill": "superpowers:brainstorming",
      "gate": "human_approval"
    },
    {
      "id": "support-review",
      "title": "Review customer impact and risk",
      "skill": "./skills/support-review",
      "gate": "human_approval"
    },
    {
      "id": "plan",
      "title": "Write the fix plan",
      "skill": "superpowers:writing-plans"
    },
    {
      "id": "evidence",
      "title": "Record fix evidence and rollback context",
      "skill": "pony-trail"
    }
  ]
}
```

Keep every `steps[].skill` value exactly equal to one of the `skills[].source`
values.

## 4. Add Local Skill Guidance

If your workflow has its own local skill, create or rename a skill folder:

```text
examples/workflows/support-triage/skills/support-review/SKILL.md
```

Example:

```markdown
---
name: support-review
description: "Review support fixes for customer impact, urgency, and rollback risk."
---

# Support Review

Use this skill when a support issue needs a fix plan.

Check:

- affected users or accounts
- severity and urgency
- reproduction evidence
- rollback path
- customer-visible acceptance criteria
```

Then update `workflow.json` to use:

```json
{ "source": "./skills/support-review" }
```

## 5. Validate The Bundle

Run:

```bash
bun run dev -- bundle validate examples/workflows/support-triage
```

Expected output:

```text
Workflow bundle valid: support-triage@0.1.0
Steps: 4
Skills: 4
```

## 6. Test Local Install

Install it into a project:

```bash
bun run dev -- workflow install examples/workflows/support-triage
```

Then list installed workflows:

```bash
bun run dev -- workflow list
```

You should see:

```text
support-triage 0.1.0
```

Restart your agent app after installing, so Codex, Claude, Cursor, or GitHub
Copilot reloads the installed skills.

## 7. Share It On GitHub

Ponyrace lives at:

```text
git@github.com:0xroylee/ponytrails.git
```

If you have write access:

```bash
git switch -c codex/add-support-triage-workflow
git add examples/workflows/support-triage
git commit -m "docs: add support triage workflow example"
git push origin codex/add-support-triage-workflow
```

If you do not have write access, fork the repo on GitHub, push the branch to
your fork, then open a pull request into `0xroylee/ponytrails`.

Before opening the pull request, run:

```bash
rtk bun run check
```

In the pull request, include:

- what workflow you added
- who should use it
- the command you ran to validate it
- whether it includes local skills

## 8. Bundle Review Checklist

Before sharing, check:

- The workflow name is lowercase and hyphenated.
- `workflow.json` passes `bundle validate`.
- Every step references a declared skill source.
- Local skills have a `SKILL.md` with frontmatter.
- The README explains when to use the workflow.
- The workflow is narrow enough to run repeatedly.
