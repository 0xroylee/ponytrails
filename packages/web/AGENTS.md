# devos.ing Web Agent Instructions

The web package owns the Next.js operator UI. Build useful monitoring,
configuration, and control surfaces directly, and keep UI behavior aligned with
the repository's server/API and realtime contracts.

## Ownership Rules

1. Keep web UI code under `packages/web/src/`.
2. Use the existing React Query and provider plumbing for client-side data
   fetching and app-level state.
3. Keep API access isolated in `src/lib/api/` client/query/mutation modules
   instead of scattering fetch logic through components.
4. Keep realtime behavior isolated in `src/lib/realtime/` and shared UI state
   in `src/lib/ui-store/`.
5. Keep reusable UI behavior in components and helpers that match the existing
   Next.js, TypeScript, and Tailwind setup.
6. Do not move workflow orchestration, CLI execution, or integration logic into
   the web package.

## Frontend Quality

1. Build the usable operator experience as the first screen; do not add a
   marketing-style landing page unless explicitly requested.
2. Keep layouts responsive and verify that text and controls do not overlap on
   mobile or desktop viewports.
3. Avoid visible in-app text that explains implementation details, keyboard
   shortcuts, or styling mechanics.
4. Use feature-complete controls for expected workflows, and prefer concise,
   scan-friendly operational UI over decorative presentation.
5. After meaningful visible UI changes, run the web app locally and verify it in
   a browser.

## React State And Data Flow

1. Use Zustand for complex client-side stores.
2. Do not put setters into `useEffect`.
3. Use `useMemo` only when derived values are expensive, passed to memoized
   children, or reused across renders in a way that benefits from memoization.
4. Do not create custom hooks for simple data fetching. Use `useQuery` and
   `useMutation` directly.

## Component Structure

1. Put state declarations at the top of the component.
2. Define event handlers after state declarations.
3. Memoize properly, especially for values or callbacks that may be used in the
   React Native app.
4. Keep JSX at the end of the component.
5. Keep components under 250 lines.

## TypeScript Conventions

1. Do not use `any`; prefer `unknown` when the type is not yet known.
2. Always consider strict mode behavior when adding or changing types.
3. Use explicit return types for functions.
4. Use PascalCase for types and interfaces.
5. Use camelCase for variables and functions.
6. Use string enums with explicit initializers.

## Tests And Checks

1. Add tests for new UI data contracts or behavior when a test harness exists.
2. Otherwise, run the relevant package checks for visible or data-flow changes:
   - `bun run --filter web typecheck`
   - `bun run --filter web build`
3. After meaningful visible UI changes, run the local web app and verify the
   affected viewport in a browser.
4. For repo-wide changes, still run the root quality gates from the root
   `AGENTS.md`.

## Workflow Checkpoints

- Before implementation edits, re-state the scoped plan and confirm the web
  modules expected to change.
- After implementation edits and before validation, summarize changed UI or
  data-flow behavior and any tests added or updated.
- After checks run, report pass/fail/blocker status, skipped commands, and
  remaining risk.
