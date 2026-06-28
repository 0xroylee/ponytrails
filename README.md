<img src="/assets/ponyrace.png" alt="Ponyrace" width="640" />

# Ponyrace Workflows

Install reusable AI-agent workflows made from multiple skills.

The first bundled workflow is `product-dev`. It composes Superpowers
brainstorming, Ponyrace requirement review, Superpowers writing-plans, and
Ponytrail file-change evidence.

The original `/ponyrace` requirement review remains available as a lower-level
primitive. Workflow bundles are now the main direction.

## Quick Start

Install the first bundled workflow in the project where your agent will work:

```bash
npx ponyrace workflow install product-dev
```

List installed workflows:

```bash
npx ponyrace workflow list
```

Create your own workflow bundle:

```bash
npx ponyrace bundle init release-review
npx ponyrace bundle validate release-review
```

Or inspect the checked-in example:

```bash
npx ponyrace bundle validate examples/workflows/release-review
```

New workflow authors can follow the step-by-step guide in
[`docs/workflow-author-guide.md`](docs/workflow-author-guide.md).

Restart your agent IDE so Codex, Claude, Cursor, or GitHub Copilot loads any
newly installed skills.

## Workflow Bundles

A workflow bundle is a folder with a `workflow.json` manifest plus optional
local skills:

```text
release-review/
  workflow.json
  README.md
  skills/
    custom-review/
      SKILL.md
```

`workflow.json` names skill dependencies and ordered steps. V1 uses JSON so the
runtime can validate bundles without adding another parser dependency.

```json
{
  "schemaVersion": "0.1",
  "name": "release-review",
  "version": "0.1.0",
  "description": "Review and plan release changes.",
  "skills": [
    { "source": "superpowers:brainstorming" },
    { "source": "./skills/custom-review" },
    { "source": "superpowers:writing-plans" },
    { "source": "pony-trail" }
  ],
  "steps": [
    {
      "id": "shape",
      "title": "Shape the request",
      "skill": "superpowers:brainstorming",
      "gate": "human_approval"
    },
    {
      "id": "custom-review",
      "title": "Run the bundle-specific review",
      "skill": "./skills/custom-review",
      "gate": "human_approval"
    },
    {
      "id": "plan",
      "title": "Write the implementation plan",
      "skill": "superpowers:writing-plans"
    },
    {
      "id": "evidence",
      "title": "Record evidence and rollback context",
      "skill": "pony-trail"
    }
  ]
}
```

Workflow install writes normalized project state under `.ponyrace/workflows/`
and installs the listed skills for the selected agent targets.

Automatic workflow step execution is intentionally deferred while the bundle
contract stabilizes.

## Ponyrace Primitive

The requirement-review primitive is still available from chat:

```text
/ponyrace add CSV import to the admin dashboard. Scope: admin import only. Evidence: tests and one smoke import.
```

Or from a shell:

```bash
npx ponyrace ponyrace "add CSV import to the admin dashboard. Scope: admin import only. Evidence: tests and one smoke import."
```

## Good Requests

Use this shape:

```text
/ponyrace <outcome>. Scope: <what is included or excluded>. Evidence: <checks that prove it works>.
```

Examples:

```text
/ponyrace fix the login redirect loop. Scope: redirect handling only. Evidence: regression test and auth smoke check.
```

```text
/ponyrace add CSV import to the admin dashboard. Scope: upload, parse, validation, and result UI. Evidence: parser tests, validation tests, and one smoke import.
```

Ponyrace uses local deterministic pony review by default. To run external
worker-backed research, opt in with `--research` and pick the worker CLI that
may receive the requirement plus private repo, tool, and dirty-worktree context:

```bash
npx ponyrace ponyrace --research --worker codex "review the refund webhook plan. Scope: tests only, no live refunds. Evidence: refund fixture and dry-run smoke output."
```

Use `--no-research` when you want to make the local-only choice explicit.

## What Ponyrace Prints

You should see:

- role pony discussion
- approval tally
- Judge summary
- final votes
- detailed requirement
- `Human confirmation: pending`

`Human confirmation: pending` means implementation is still blocked until you
explicitly approve the detailed requirement.

By default, Markdown reports are saved under `.ponyrace/ponyrace/`.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npx ponyrace workflow install product-dev` | Install the bundled product development workflow and its skills. |
| `npx ponyrace workflow list` | Show installed workflow bundles. |
| `npx ponyrace bundle init <name>` | Create a workflow bundle scaffold. |
| `npx ponyrace bundle validate <path>` | Validate a workflow bundle manifest. |
| `npx ponyrace onboard` | Create `.ponyrace/` files and install default skills. |
| `npx ponyrace setup` | Configure ponies, models, approval threshold, and skills. |
| `npx ponyrace ponyrace "<request>"` | Run a requirement race from the shell. |
| `npx ponyrace skills install pony-trail` | Install only the file-change history skill. |
| `npx ponyrace history` | Show local snapshot history. |
| `npx ponyrace history --details` | Show detailed snapshot metadata. |
| `npx ponyrace revert <snapshot-id> --dry-run` | Preview restoring files from a snapshot. |

## Local Files

Ponyrace writes local project state under `.ponyrace/`:

```text
.ponyrace/
  manifest.json
  workflows/
  ponyrace/
  snapshots.jsonl
  sessions/
```

Keep `.ponyrace/` out of git unless you intentionally want to share project
policy or generated reports.

## Local Development

```bash
bun install
bun run build
bun test
bun run check
```

## Migration: 0.2.0

Version `0.2.0` renames the package and CLI binary from `ponytrail` to
`ponyrace`.

```bash
npx ponytrail onboard
# becomes
npx ponyrace onboard

bunx ponytrail onboard
# becomes
bunx ponyrace onboard
```
