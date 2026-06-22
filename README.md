<img src="/assets/pony-trail.png" alt="Pony Trail" width="640" />

# Ponytrail

Ponytrail records agent file-change snapshots, shows the snapshot history tree, and can restore files from a previous snapshot.

## Onboard

Run guided setup. The CLI asks for your workspace name, creates local `.ponytrail` files, and installs the bundled `pony-trail` skill for Claude, GitHub Copilot, and Codex:

```bash
npx ponytrail onboard
```

With Bun:

```bash
bunx ponytrail onboard
```

## View History

Show the local snapshot tree:

```bash
ponytrail history
```

Include detailed commit metadata:

```bash
ponytrail history --details
```

Effect preview:

```text
Snapshot history
* ponytrail-skills
  * skill-install-20260622064256Z-99fa03fd (pre/post)
    action: install skill
    summary: Installed pony-trail skill for claude, copilot, codex
    checks: ponytrail skills install pony-trail --home . --agents claude, copilot, codex
    result: claude:installed, copilot:installed, codex:installed
    rollback: Remove or reinstall the affected agent skill folders, then record another snapshot.
```

Filter to one session or print machine-readable output:

```bash
ponytrail history --session <session-id>
ponytrail history --json
```

Snapshots are read from:

```text
.pony-trail/
  snapshots.jsonl
  sessions/<session-id>/tree.md
```

`ponytrail skills install` and `ponytrail onboard` also record a project-local
skill-install commit before they write agent skill files, so the install can be
found later in `ponytrail history --details`.

## Revert A Snapshot

Preview the file actions first:

```bash
ponytrail revert <snapshot-id> --dry-run
```

Apply the revert:

```bash
npx ponytrail revert <snapshot-id>
```

The CLI prints the planned file actions and asks before applying them. In
non-interactive environments, Ponytrail prints the plan and cancels without
changing files.

Revert restores files from the snapshot's `pre` state. If a file did not exist before the snapshot, Ponytrail deletes it during the revert.

## Local Development

```bash
bun install
bun run build
bun test
bun run check
```
