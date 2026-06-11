import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";
import { collectApiRouteDocs } from "../src/http/api-docs";
import { createAppRoutes } from "../src/http/app-routes";

const EXPECTED_ROUTE_KEYS = [
	"GET /health",
	"GET /api/agents",
	"POST /api/agents",
	"GET /api/agents/{id}",
	"PATCH /api/agents/{id}",
	"DELETE /api/agents/{id}",
	"GET /api/board-projects",
	"GET /api/board-tasks",
	"GET /api/chat/sessions",
	"POST /api/chat/sessions",
	"PATCH /api/chat/sessions/{id}",
	"DELETE /api/chat/sessions/{id}",
	"GET /api/chat/sessions/{id}/messages",
	"POST /api/chat/sessions/{id}/messages",
	"POST /api/chat/sessions/{id}/send",
	"GET /api/chat/sessions/{id}/status",
	"GET /api/cli/history",
	"GET /api/command-history",
	"GET /api/computers",
	"GET /api/docs/routes",
	"GET /api/github/connection",
	"DELETE /api/github/connection",
	"POST /api/github/device/poll",
	"POST /api/github/device/start",
	"GET /api/github/oauth/callback",
	"GET /api/github/oauth/start",
	"GET /api/github/repositories",
	"GET /api/github/repositories/search",
	"GET /api/inbox/messages",
	"POST /api/inbox/messages",
	"GET /api/jobs",
	"POST /api/notifications",
	"POST /api/notifications/email",
	"GET /api/polling/status",
	"GET /api/project-boards",
	"GET /api/projects",
	"POST /api/projects",
	"GET /api/projects/{id}",
	"PATCH /api/projects/{id}",
	"DELETE /api/projects/{id}",
	"GET /api/settings/github",
	"PATCH /api/settings/github",
	"GET /api/settings/models",
	"PATCH /api/settings/models",
	"GET /api/skills",
	"POST /api/skills",
	"GET /api/skills/{id}",
	"PATCH /api/skills/{id}",
	"DELETE /api/skills/{id}",
	"GET /api/tasks",
	"POST /api/tasks",
	"POST /api/tasks/chat-create",
	"GET /api/tasks/{id}",
	"PATCH /api/tasks/{id}",
	"DELETE /api/tasks/{id}",
	"GET /api/tasks/{id}/activity",
	"GET /api/token-usage",
	"GET /api/workspace/current",
	"GET /api/workspace/environment",
	"GET /api/workspaces/{workspaceId}/projects",
	"GET /api/workspaces/{workspaceId}/projects/{projectId}/board",
];

describe("api docs routes", () => {
	it("generates docs for every current server route", () => {
		const docs = collectApiRouteDocs(createAppRoutes(createDeps()));
		const routeKeys = docs.map((route) => `${route.method} ${route.path}`);

		expect([...routeKeys].sort()).toEqual([...EXPECTED_ROUTE_KEYS].sort());
		expect(new Set(routeKeys).size).toBe(routeKeys.length);
		expect(docs).toContainEqual(
			expect.objectContaining({
				group: "Workspace",
				method: "GET",
				path: "/api/workspaces/{workspaceId}/projects/{projectId}/board",
				pathParams: ["workspaceId", "projectId"],
			}),
		);
		expect(docs).toContainEqual(
			expect.objectContaining({
				group: "Agents",
				method: "PATCH",
				path: "/api/agents/{id}",
				requestBody: "Agent update payload.",
			}),
		);
	});

	it("serves generated docs from the app route", async () => {
		const app = createHandleRequest(createDeps());

		const response = await app(new Request("http://localhost/api/docs/routes"));
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.routes).toContainEqual(
			expect.objectContaining({
				method: "GET",
				path: "/api/docs/routes",
				group: "Docs",
			}),
		);
	});

	it("keeps the docs endpoint GET-only", async () => {
		const app = createHandleRequest(createDeps());

		const response = await app(
			new Request("http://localhost/api/docs/routes", { method: "POST" }),
		);

		expect(response.status).toBe(405);
		expect(await response.json()).toEqual({ error: "Method Not Allowed" });
	});
});

function createDeps() {
	return {
		cliExecutor: {
			execute: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			executeStream: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			getHistory: () => [],
		},
	};
}
