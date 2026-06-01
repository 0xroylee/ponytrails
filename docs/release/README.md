# Release Guide

This guide covers releasing the published `devos` CLI package so users can run
it through the hosted installer, `npx devos`, or `bunx devos`.

## Scope

The release helper publishes the current `packages/cli` package version. It does
not create changesets, bump versions, update changelogs, or commit files.

Use the helper when the CLI package is already versioned and committed.

## Prerequisites

1. Start from an up-to-date branch that includes current `main`.
2. Confirm the release version in `packages/cli/package.json`.
3. Commit version, changelog, and release-note changes before publishing.
4. Authenticate to the npm registry used by Bun.
5. Keep an npm one-time password ready if the package requires 2FA.

Useful checks:

```bash
git status --short --branch
bun pm whoami
```

## Prepare The Version

If the release needs a version bump, run the normal changeset versioning flow
first and commit the result.

```bash
bun run changeset version
git status --short
```

Review all changed package versions before committing. The CLI release script is
package-specific, but the changeset versioning step may update other workspace
packages when their changesets require it.

## Dry Run

Run the release helper without `--publish` first.

```bash
bun run release:cli
```

The dry run stops unless the worktree is clean. It then runs:

1. `bun run --filter devos check`
2. `bun run --filter devos typecheck`
3. `bun run --filter devos test`
4. `bun run --filter devos build`
5. `bun pm pack --dry-run --ignore-scripts`
6. `bun publish --dry-run --access public`

Treat any failure as a release blocker. Fix the issue, commit the fix, and run
the dry run again.

## Publish

Publish only after the dry run succeeds on the same committed version.

```bash
bun run --filter devos release --publish
```

Publish with a dist tag:

```bash
bun run --filter devos release --publish --tag next
```

Publish with a one-time password:

```bash
bun run --filter devos release --publish --otp 123456
```

Dist tags and OTP can be combined:

```bash
bun run --filter devos release --publish --tag next --otp 123456
```

The publish command always runs the same verification and dry-run publish steps
before the real `bun publish`.

## Post-Release Checks

Verify the registry entry and the zero-install CLI path.

```bash
bun pm view devos version
bunx devos@latest help
bunx devos@latest onboard --check
```

If you published with a non-`latest` tag, test that tag explicitly.

```bash
bunx devos@next help
```

Check the hosted installer script without executing it:

```bash
curl -fsSL https://devos.ing/cli
```

## Troubleshooting

Dirty worktree:

The release helper exits before checks when `git status --porcelain` has output.
Commit, stash, or revert unrelated changes before releasing.

Registry auth failure:

Run `bun pm whoami` to confirm the active registry identity. Re-authenticate with
your npm credentials if needed, then rerun the dry run.

Two-factor auth failure:

Rerun publish with `--otp <code>`.

Wrong version published:

Do not overwrite the published version. Prepare and publish a new patch version
with a corrective changelog entry.
