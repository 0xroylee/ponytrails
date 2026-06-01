# Production Daemon Sandbox Design

## Goal

Create a reproducible local sandbox for testing the production `devos daemon`
entrypoint from this checkout's built artifacts without touching the user's
normal devos home config, workspace state, Codex home, default database, or
default development ports.

## Selected Approach

Use a repo-level Bun script invoked through `bun run sandbox:daemon`. The script
prepares ignored sandbox directories under `.devos/sandboxes/production-daemon/`,
sets isolated environment variables, optionally runs `bun run build`, and then
executes the built local CLI with `packages/cli/dist/index.js daemon`.

This keeps the test close to production daemon behavior while avoiding published
package drift and avoiding Docker-specific behavior.

## Runtime Layout

The sandbox owns these paths under `.devos/sandboxes/production-daemon/`:

- `home/`: assigned to `HOME`, so instance config and secret DB resolve to a
  sandboxed `home/.devos/`.
- `workspace/`: assigned to `PIV_WORKSPACE_PATH` and `PIV_EXECUTION_PATH`.
- `codex-home/`: assigned to `CODEX_HOME`.
- `server-db/`: assigned to `PIV_SERVER_DATABASE_PATH`.
- `logs/`: exposed through the instance config logging path.
- `storage/`: exposed through the instance config storage path.
- `backups/`: exposed through the instance config database backup path.

The script writes `home/.devos/config/instance.config.json` using the same shape
as onboarding config. It does not write the real `~/.devos`.

## Ports And URLs

The sandbox defaults to ports that do not collide with the normal local stack:

- server API: `http://127.0.0.1:3101`
- web UI: `http://127.0.0.1:3100`
- embedded PostgreSQL: `55429`
- workflow websocket: `ws://127.0.0.1:3101/api/workflow`

Flags allow explicit overrides:

- `--server-port <port>`
- `--web-port <port>`
- `--db-port <port>`
- `--skip-build`

The script validates that the three ports are positive integer TCP ports and
that they are distinct.

## Command Behavior

By default, `bun run sandbox:daemon`:

1. Ensures sandbox directories exist.
2. Writes the sandbox instance config.
3. Runs `bun run build`.
4. Prints the sandbox home, workspace, server health URL, web URL, and command.
5. Spawns `bun packages/cli/dist/index.js daemon` with inherited stdio.

`--skip-build` skips step 3 for faster repeated runs after a successful build.

## Testing

Add focused tests for:

- default sandbox paths, ports, URLs, and environment values
- override parsing for ports and `--skip-build`
- invalid and conflicting port rejection
- runner command sequence with a fake command runner

Validation should run the focused sandbox tests first, then the CLI package
checks affected by adding a root script test.
