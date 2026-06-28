# Release Review Workflow

This is an example workflow bundle for teams that want an agent to shape, review,
plan, and preserve evidence for release-related changes.

Install it from the repo root:

```bash
ponyrace workflow install examples/workflows/release-review
```

Validate it while authoring:

```bash
ponyrace bundle validate examples/workflows/release-review
```

The local `release-risk-review` skill is included to demonstrate how bundle
authors can add workflow-specific guidance without changing the Ponyrace runtime.
