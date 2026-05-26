# devos.ing Landing Package Instructions

The landing package owns the public marketing site. Keep it separate from the
operator UI and do not move workflow control, API execution, or server behavior
into this package.

## Ownership Rules

1. Keep landing routes under `packages/landing/src/app/`.
2. Keep landing components under `packages/landing/src/components/`.
3. Keep static copy/data in landing-owned modules such as `src/lib/` or
   component-local data files.
4. Keep the page visually polished, responsive, and tied to the product story,
   but avoid coupling it to authenticated operator workflows.
5. Use existing Next.js, React, Tailwind, and lucide patterns already present in
   this package.
6. Do not duplicate web operator UI components unless the shared boundary is
   intentionally introduced.

## Tests And Checks

1. Do not add or keep React component rendering tests, markup assertions,
   class-name assertions, UI copy assertions, skeleton/layout tests, or
   component interaction tests.
2. Keep any future landing tests focused on service/data helpers and pure
   utilities only.
3. For visible UI changes, use typecheck/build and browser verification instead
   of component tests.
4. Run package-level validation for landing changes:
   - `bun run --filter landing typecheck`
   - `bun run --filter landing build`
5. After meaningful visible changes, run the landing site locally and verify the
   affected viewport in a browser.
6. For repo-wide changes, run the repository quality gates from the root
   `AGENTS.md`.
