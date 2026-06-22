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
ponytrail revert <snapshot-id> --yes
```

Revert restores files from the snapshot's `pre` state. If a file did not exist before the snapshot, Ponytrail deletes it during the revert.

## Local Development

```bash
bun install
bun run build
bun test
bun run check
```
