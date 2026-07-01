# Proposal: Install GetSuperpower Workflows From Public Git

## Summary

Allow `getsuperpower install` and `getsuperpower clone` to accept a public git
repository source for a GetSuperpower workflow bundle.

The v1 shape should keep the existing install semantics: load `workflow.json`,
validate the manifest, install every declared skill dependency, and record the
installed workflow under `.getsuperpower/workflows`. The only new behavior is
that the source can be fetched from public git before the existing bundle loader
runs.

Example command model:

```bash
getsuperpower install https://github.com/acme/release-review.git
getsuperpower clone https://github.com/acme/release-review.git
getsuperpower validate https://github.com/acme/release-review.git
getsuperpower deps https://github.com/acme/release-review.git
```

## Motivation

GetSuperpower already supports bundled names and local workflow folders. Authors
can create and share a workflow, but users still need a local clone before they
can install it. Public git support makes sharing one step simpler:

- Authors can publish a workflow bundle in a public repository.
- Users can install or clone it directly from the repository URL.
- The CLI can reuse the same manifest validation and dependency install path.
- Local skills inside the workflow remain relative to the fetched bundle.

## Scope

In scope:

- Treat public git HTTPS URLs as workflow sources for `install`, `clone`,
  `validate`, and `deps`.
- Fetch the repository into a temporary workspace before reading
  `workflow.json`.
- Support workflow bundles at the repository root.
- Preserve relative local skills such as `./skills/release-review` during the
  install run.
- Record installed git-sourced workflows with source metadata that identifies
  the original git URL.
- Add focused tests around git-source loading, install/clone behavior, cleanup,
  and error messages.
- Add an end-to-end raw sandbox smoke check that installs from public git using
  an empty project directory, an empty workspace-local home directory, and a
  minimal environment so the result does not depend on the developer's existing
  agent setup.
- Update README and author guide copy to show public git install examples.

Out of scope:

- A hosted registry service.
- Private repositories, credential prompts, or token handling.
- Publishing workflows to GitHub.
- Updating the manifest schema.
- Reintroducing paused Pony Trail history/revert/prehook commands.

## Proposed Design Direction

Add a small git workflow-source resolver in the GetSuperpower loading path. It
should detect public git URL sources before local/bundled source resolution,
clone them with a non-shell command runner, and then pass the checked-out bundle
directory into the existing manifest loader.

The resolver should return durable source metadata separately from the temporary
checkout path, so installed workflow records do not point at deleted temp
directories.

The first implementation should keep the supported source form conservative:
public HTTPS git repositories whose root contains `workflow.json`. Subdirectory
support can be added later with an explicit URL or option once the root install
flow is proven.

## Acceptance Criteria

- `getsuperpower install https://github.com/<owner>/<repo>.git` fetches a public
  workflow repo, installs the declared skills, and writes a workflow record.
- `getsuperpower clone https://github.com/<owner>/<repo>.git` behaves the same
  as install.
- `getsuperpower validate <public-git-url>` validates the fetched
  `workflow.json` and prints the existing validation summary.
- `getsuperpower deps <public-git-url>` lists the fetched workflow skill
  dependencies.
- Local skill paths declared by the fetched workflow resolve relative to the
  fetched repository during install.
- Installed workflow records identify git-sourced workflows as git sources and
  store the original URL instead of the temporary checkout path.
- Temp checkout directories are cleaned after successful and failed command
  runs.
- Invalid or unsupported git sources fail with a clear message.
- A raw sandbox smoke install succeeds from an empty project directory with an
  empty `--home` directory and a minimal environment, then writes only the
  expected `.getsuperpower/workflows` record and agent skill files inside that
  sandbox.
- Existing bundled and local source behavior continues to work.
- `rtk bun run check` passes before delivery.

## Open Questions For Review

- Should v1 support only repository-root workflows, or also GitHub tree URLs for
  workflows stored in a subdirectory?
- Should source metadata record only the URL, or also the resolved commit hash
  when `git rev-parse HEAD` succeeds?
- Should `clone` output keep saying "installed" like today, or mention that the
  source was fetched from git?
