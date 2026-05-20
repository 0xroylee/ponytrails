# New User Onboarding

## Goal

Get a new operator from zero onboarding to running a scoped project workflow.

## Preconditions

1. Repository is cloned.
2. `bun`, `gh`, and `rtk` are installed.
3. Linear and GitHub credentials are available.

## Onboard

1. Run `devos onboard` and answer the guided prompts.
2. Confirm the wizard writes `.env` for secrets, `devos.local.config.ts` for local project settings, and `.devos/config/instance.config.json` for the local trusted instance.
3. Run `devos onboard --check` to verify config, GitHub auth, RTK availability, Codex availability, and secret placement.

## First Run

1. Run `bun run packages/cli/src/index.ts projects` to verify project resolution.
2. Run `bun run packages/cli/src/index.ts run --project <PROJECT_ID>` for one scoped project.
3. Validate run state appears under `.devos/projects/<project-id>/runs`.

## Success Criteria

1. One issue is picked up for the selected project.
2. Stage transitions reach planning and implementation.
3. Linear comments reflect workflow progress.
