<img src="/assets/getsupwerpower.jpg" alt="GetSuperpower" width="640" />

# GetSuperpower

GetSuperpower installs reusable AI-agent workflows.

A **GetSuperpower** is a deployable bundle skills set for an AI agent workflow.
It installs the skills a project needs, records the workflow under `.getsuperpower/`,
and can give users one entry skill to call when the workflow provides one.

## Quick Start

Install or clone the default product-development GetSuperpower:

```bash
npx getsuperpower install product-dev
```

Install from a public git repository:

```bash
npx getsuperpower install https://github.com/acme/release-review.git
npx getsuperpower install 'https://github.com/acme/workflows.git#examples/release-review'
```

List installed GetSuperpowers:

```bash
npx getsuperpower list
```

Supported agents: Claude, Codex, opencode, Cursor, and GitHub Copilot.

Restart your agent after installing skills so it reloads them.

## How It Works

<img src="assets/diagrams/getsuperpower-how-it-works.svg" alt="GetSuperpower workflow diagram" width="720" />

`workflow.json` installs the skill tree. The entry skill runs it. Sub-skills are the steps the agent follows.

### Install And Run Sequence

<img src="assets/diagrams/getsuperpower-install-sequence.svg" alt="GetSuperpower install and run sequence diagram" width="920" />

## Try A Callable Workflow

Some GetSuperpowers include an entry skill. That is the one skill a user calls to run the whole skill tree.

From a cloned repo, the OpenSpec + Superpowers example installs `$openspec-superpowers`:

```bash
npx getsuperpower install examples/workflows/openspec-superpowers
```

Then restart your agent app and invoke:

```text
$openspec-superpowers implement this OpenSpec change
```

The entry skill tells the agent to use the required sub-skills in order. The CLI handles installation, validation, and local workflow records.

## Create Your Own

Start with the [Create Your Own Workflow guide](docs/workflow-author-guide.md) if you want to author and share a workflow bundle.

Create a new GetSuperpower:

```bash
npx getsuperpower init release-review
```

This creates:

```text
release-review/
  workflow.json
  README.md
  skills/
    release-review/
      SKILL.md
    custom-review/
      SKILL.md
```

`skills/release-review/SKILL.md` is the entry skill. Edit it when you want users to call one skill that coordinates many sub-skills.

Install the authoring helper if you want an agent to help design bundle skills:

```bash
npx getsuperpower skills install creating-bundle-skills
```

Then ask your agent to use:

```text
$creating-bundle-skills create a GetSuperpower for release review
```

That skill should help you choose a focused workflow, draft the entry skill,
align `workflow.json`, and validate the bundle before you share it.

Validate before sharing:

```bash
npx getsuperpower validate release-review
npx getsuperpower deps release-review
```

The full guide is in [`docs/workflow-author-guide.md`](docs/workflow-author-guide.md).

## Examples

| Example | Use it for | Notes |
| --- | --- | --- |
| `examples/workflows/openspec-superpowers` | OpenSpec proposal -> Superpowers planning/TDD -> archive. | Includes `$openspec-superpowers`. |
| `examples/workflows/real-engineering` | RTK, `pony-trail`, Superpowers, and Matt Pocock skills together. | Fetches Matt Pocock skills if missing. |
| `examples/workflows/release-review` | Small release-risk review workflow. | Good starter example. |

GetSuperpower install automatically uses the Skills CLI to fetch missing `mattpocock:*` dependencies. If that automatic bootstrap fails, run the same package install through the CLI and retry:

```bash
npx getsuperpower skills install mattpocock/skills
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `npx getsuperpower install product-dev` | Install the default GetSuperpower. |
| `npx getsuperpower clone product-dev` | Same as install; deploy a GetSuperpower by name or source. |
| `npx getsuperpower install https://github.com/acme/release-review.git` | Install a GetSuperpower from a public git repo. |
| `npx getsuperpower deps <source>` | Show required skills before install or clone. |
| `npx getsuperpower list` | Show installed GetSuperpowers. |
| `npx getsuperpower init <name>` | Create a GetSuperpower scaffold. |
| `npx getsuperpower validate <path>` | Validate a workflow manifest. |
| `npx getsuperpower skills install` | Install the GetSuperpower authoring skill. |
| `npx getsuperpower skills install mattpocock/skills` | Install an external skills package through the Skills CLI. |
| `npx getsuperpower skills install creating-bundle-skills` | Install the GetSuperpower authoring skill. |

The older `bundle` and `workflow` commands still work as compatibility aliases.

## Local Files

The CLI writes installed workflow records under `.getsuperpower/`:

```text
.getsuperpower/
  workflows/
```

Pony Trail history, revert, and prehook features are paused while GetSuperpower focuses on bundle skills.

Keep `.getsuperpower/` out of git unless you intentionally want to share installed workflow records.

## Local Development

```bash
bun install
bun run build
bun test
bun run check
bun scripts/smoke-public-git-install.ts
```

## Compatibility

The package and CLI binary are named `getsuperpower`.
