# Runtime Ping Agent Status Design

## Goal

The server should verify that the CLI runtime worker is reachable before reporting agent availability. If the runtime ping fails, times out, or no CLI worker is connected, every agent returned by `GET /api/agents` should have `status: "offline"`.

## Scope

- Applies to all agents returned by `GET /api/agents`, including persisted agents and config-backed default workflow agents.
- Reuses the existing `/api/workflow` websocket protocol, where the CLI worker already handles `ping` frames and replies with `pong`.
- Keeps runtime health detection inside the server's CLI boundary instead of duplicating CLI workflow logic in agent CRUD code.

## Approach

Add a narrow runtime-health method to the existing CLI executor boundary. The workflow command broker will implement it by sending a `ping` frame to the active CLI worker and waiting for a matching `pong` within a short timeout. If the active worker is missing, closed, replaced, disconnected, or does not answer in time, the method returns unhealthy.

The agent route will continue to read agents through the current paths:

- persisted agents from the entity CRUD service
- default workflow agents from instance config when no persisted rows exist
- individual default agents for `GET /api/agents/:id`

After building the response body, the route will call the runtime-health method. When the runtime is unhealthy, it will return a copied response with each agent status forced to `offline`. When healthy, it will preserve the agent statuses as returned by storage or config.

## Error Handling

Runtime health failures must not make `/api/agents` fail. A missing or unhealthy runtime only changes returned agent statuses to `offline`.

If no CLI health method is available in tests or alternate server setups, the server should treat runtime health as unknown and preserve current behavior.

## Tests

Add server tests before implementation:

- persisted `GET /api/agents` returns every agent as `offline` when runtime ping fails
- config-backed default `GET /api/agents` returns every agent as `offline` when runtime ping fails
- broker runtime health succeeds only after a matching `pong` and fails when no worker is connected

Use focused package-level validation for the server package first, then broader gates if the change touches shared contracts beyond the server boundary.
