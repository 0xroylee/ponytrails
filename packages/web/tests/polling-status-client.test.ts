import { describe, expect, it } from "bun:test";
import { createApiClient } from "../src/lib/api/client";
import { parsePollingStatusResponse } from "../src/lib/api/polling-status-client";

function okJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

const validPayload = {
	pollers: [
		{
			id: "internal-tasks:default",
			sourceType: "internal-tasks",
			sourceId: "default",
			projectId: null,
			state: "success",
			intervalMs: 5000,
			lastStartedAt: "2026-05-16T00:00:00.000Z",
			lastFinishedAt: "2026-05-16T00:00:01.000Z",
			lastSuccessAt: "2026-05-16T00:00:01.000Z",
			lastErrorAt: null,
			lastIssueCount: 0,
			lastStaleRetryCount: 0,
			lastReadyTaskCount: 2,
			lastDispatchCount: 1,
			consecutiveFailures: 0,
			lastError: null,
			updatedAt: "2026-05-16T00:00:01.000Z",
		},
	],
	events: [
		{
			id: "event-1",
			pollerId: "internal-tasks:default",
			sourceType: "internal-tasks",
			sourceId: "default",
			projectId: null,
			level: "info",
			eventType: "tick_completed",
			message: "Internal task polling tick completed",
			metadata: { readyTaskCount: 2, dispatchCount: 1 },
			createdAt: "2026-05-16T00:00:01.000Z",
		},
	],
};

describe("polling status client parser", () => {
	it("parses polling status payloads from the API client", async () => {
		const fetchFn = (async (input: URL | RequestInfo) => {
			expect(String(input)).toBe("/api/polling/status");
			return okJsonResponse(validPayload);
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		const response = await client.listPollingStatus();

		expect(response.pollers[0]?.id).toBe("internal-tasks:default");
		expect(response.pollers[0]?.lastReadyTaskCount).toBe(2);
		expect(response.events[0]?.eventType).toBe("tick_completed");
		expect(response.events[0]?.metadata).toEqual({
			readyTaskCount: 2,
			dispatchCount: 1,
		});
	});

	it("rejects malformed polling status payloads", () => {
		expect(() =>
			parsePollingStatusResponse({
				...validPayload,
				pollers: [{ ...validPayload.pollers[0], intervalMs: "fast" }],
			}),
		).toThrow("Invalid /api/polling/status response field 'intervalMs'");

		expect(() =>
			parsePollingStatusResponse({
				...validPayload,
				events: [{ ...validPayload.events[0], metadata: null }],
			}),
		).toThrow("Invalid /api/polling/status response field 'metadata'");
	});
});
