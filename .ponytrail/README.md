# ponytrails Ponytrail

This directory stores requirement-first runtime files for AI agent work.

## Flow

1. Draft a goal with `/goal "<request>"`.
2. Let the Product, Engineering, and Verification bots discuss the direction.
3. Lock the goal only after at least 2 of 3 bots approve and the human owner approves.
4. Start Codex, Claude, or another worker agent with the locked goal contract.
5. Use `/amend-goal` when execution discovers the goal must change.

Generated files under `.ponytrail/goals` should be treated as an append-only evidence trail.

## Local Extension Folders

- `.ponytrail/runtimes`: runtime-specific configuration and policies.
- `.ponytrail/plugins`: adapters for workers, evidence sources, and integrations.
- `.ponytrail/skills`: reusable judge or drafting capabilities.
