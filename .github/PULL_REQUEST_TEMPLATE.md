## Checklist

- [ ] If this PR changes any `package.json` workspace manifest, I ran `bun install` and committed the updated `bun.lock`.
- [ ] I ran the relevant Bun checks locally, or noted why they were skipped.

## Notes

Use Bun for dependency updates and keep CI strict. `bun install --frozen-lockfile` fails when `bun.lock` does not match the workspace manifests, so dependency changes must include the lockfile update.
