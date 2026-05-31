import { describe, expect, it } from "bun:test";
import { createApiClient } from "../src/lib/api/client";

function okJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("GitHub repositories API client", () => {
	it("lists repository options from the server API", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("/api/github/repositories");
			expect(init?.method).toBe("GET");
			return okJsonResponse({
				isAvailable: true,
				unavailableReason: null,
				repositories: [
					{
						id: "octo/core",
						owner: "octo",
						name: "core",
						nameWithOwner: "octo/core",
						defaultBranch: "main",
						isPrivate: false,
					},
				],
			});
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.listGitHubRepositories()).resolves.toEqual({
			isAvailable: true,
			unavailableReason: null,
			repositories: [
				{
					id: "octo/core",
					owner: "octo",
					name: "core",
					nameWithOwner: "octo/core",
					defaultBranch: "main",
					isPrivate: false,
				},
			],
		});
	});

	it("gets GitHub OAuth connection state from the server API", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("/api/github/connection");
			expect(init?.method).toBe("GET");
			return okJsonResponse({
				isConfigured: true,
				isConnected: true,
				login: "octo",
				unavailableReason: null,
			});
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.getGitHubConnection()).resolves.toEqual({
			isConfigured: true,
			isConnected: true,
			login: "octo",
			unavailableReason: null,
		});
	});

	it("disconnects GitHub OAuth through the server API", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("/api/github/connection");
			expect(init?.method).toBe("DELETE");
			return okJsonResponse({
				isConfigured: true,
				isConnected: false,
				login: null,
				unavailableReason: "Connect GitHub to list repositories",
			});
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.disconnectGitHub()).resolves.toEqual({
			isConfigured: true,
			isConnected: false,
			login: null,
			unavailableReason: "Connect GitHub to list repositories",
		});
	});
});
