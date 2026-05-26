import { describe, expect, it } from "bun:test";
import { createApiClient } from "../src/lib/api/client";
import { parseWorkflowComputerList } from "../src/lib/api/workflow-computer-client";

function okJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("workflow computer API client", () => {
	it("fetches registered workflow computers", async () => {
		const payload = [
			workflowComputerPayload({ status: "online" }),
			workflowComputerPayload({
				id: "worker-offline",
				status: "offline",
				disconnectedAt: "2026-05-24T00:00:03.000Z",
			}),
		];
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("/api/computers");
			expect(init?.method).toBe("GET");
			return okJsonResponse(payload);
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.listWorkflowComputers()).resolves.toEqual(payload);
	});

	it("validates workflow computer payloads", () => {
		expect(() =>
			parseWorkflowComputerList([
				workflowComputerPayload({ status: "retired" }),
			]),
		).toThrow("Invalid /api/computers response field 'status'");
	});
});

function workflowComputerPayload(
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		id: "worker-online",
		name: "Roy's MacBook",
		hostname: "roys-macbook.local",
		platform: "darwin",
		arch: "arm64",
		cwd: "/repo",
		startedAt: "2026-05-24T00:00:00.000Z",
		workerId: "worker-1",
		status: "online",
		connectedAt: "2026-05-24T00:00:01.000Z",
		lastSeenAt: "2026-05-24T00:00:02.000Z",
		processId: 1234,
		user: "roy",
		...overrides,
	};
}
