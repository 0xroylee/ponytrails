# Proposal: Beautify GetSuperpower CLI Output

## Summary

Give the GetSuperpower CLI a more polished first impression: a branded
`GETSUPERPOWER` ASCII logo, a warm welcome message, clearer command examples,
and a consistent color system for status output.

The direction should reference the product polish of Shopify CLI without
copying Shopify branding. GetSuperpower should feel sharper and more agentic:
electric cyan for the brand, lime for success, amber for warnings, rose for
errors, and dim slate text for secondary paths.

## Motivation

The current root help is functional Commander output:

```text
Usage: getsuperpower [options] [command]

Install, author, and inspect GetSuperpower skill trees.
```

That is accurate, but it does not teach the product mood or the primary loop.
The CLI is now the main product surface for installing workflow bundles, so the
first screen should quickly answer:

- what GetSuperpower is;
- which command to run first;
- how to install or clone a workflow bundle;
- where skill install output belongs in the overall experience.

## Scope

In scope:

- Add a CLI style guide document for GetSuperpower terminal output.
- Add a branded root help/welcome banner with an ASCII `GETSUPERPOWER` logo.
- Use a distinct palette from Shopify while borrowing the discipline of concise,
  friendly, command-oriented CLI copy.
- Format root help with grouped commands and short examples.
- Reuse the same style helpers for success, muted labels, warnings, and next
  steps in install, validate, deps, list, and skills output.
- Preserve machine-usable command behavior and existing command names.
- Keep `src/cli.ts` thin; put reusable formatting in a small helper module and
  command-specific output near the current command modules.
- Add focused tests around root help text and stripped-ANSI command output.

Out of scope:

- Changing command semantics.
- Adding a new dependency.
- Copying Shopify colors, names, icons, or exact wording.
- Reintroducing paused Pony Trail history/revert/prehook commands.
- Building a full interactive wizard in this styling pass.

## Proposed Design Direction

Create `docs/getsuperpower-cli-design.md` as the style guide for terminal
output. This keeps the repo root clean while giving future CLI changes a stable
reference.

Add a small `src/cli-theme.ts` module that exports:

- `GETSUPERPOWER_ASCII_LOGO`;
- color helpers for brand, success, warning, error, muted labels, and commands;
- helper functions for formatted headings, key-value rows, and next-step text.

Wire Commander root help through the theme helper so `getsuperpower --help`
starts with the logo, welcome line, and examples before the command list. Keep
subcommand help useful and compact; only the root help needs the full brand
moment.

Use the existing `picocolors` dependency and rely on tests that strip ANSI
codes, so the display can be colorful for humans without making tests brittle.

## Acceptance Criteria

- `getsuperpower --help` displays an ASCII logo whose visible text reads
  `GETSUPERPOWER`.
- The root help includes a welcome message and a short primary loop:
  `init`, `validate`, `install` or `clone`, and `deps`.
- Root help lists existing public commands without restoring removed commands.
- Command output uses the new style helpers for success headings and muted
  labels.
- The color palette is documented and differs from Shopify branding.
- `docs/getsuperpower-cli-design.md` documents logo usage, palette, tone,
  help layout, status colors, and examples.
- Tests assert the stripped-ANSI help/output content.
- Existing CLI command registration tests continue to pass.
- `rtk bun run check` passes before delivery.

## Open Questions For Review

- Should the style guide live at `docs/getsuperpower-cli-design.md` as proposed,
  or do you want a root `design.md` that points to CLI-specific rules?
- Should the ASCII logo appear only in root help, or also after successful
  installs?
- Should `getsuperpower` show the welcome banner when run with no command, or
  should it continue to rely on Commander help behavior?
