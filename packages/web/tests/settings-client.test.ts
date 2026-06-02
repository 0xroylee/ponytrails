import { describe, expect, it } from "bun:test";
import { createApiClient } from "../src/lib/api/client";

describe("settings api client", () => {
	it("reads and updates workflow model settings", async () => {
		const requests: Array<{ method?: string; url: string; body?: string }> = [];
		const client = createApiClient({
			fetchFn: (async (url, init) => {
				requests.push({
					url: String(url),
					method: init?.method,
					body: init?.body?.toString(),
				});
				return Response.json({
					stages: [
						{
							id: "brainstorm",
							label: "Brainstorm",
							model: "gpt-5.4-mini",
							reasoningEffort: "xhigh",
						},
						{ id: "plan", label: "Plan", model: "gpt-5.5" },
						{ id: "implement", label: "Implement" },
						{ id: "testing", label: "Testing" },
					],
					availableModels: [
						{
							id: "gpt-5.5",
							label: "GPT-5.5",
							description: "Frontier OpenAI planning model.",
						},
					],
					reasoningEfforts: ["low", "medium", "high", "xhigh"],
				});
			}) as typeof fetch,
		});

		const settings = await client.getModelSettings();
		await client.updateModelSettings({
			stages: [
				{
					id: "testing",
					model: "gpt-5.3-codex",
					reasoningEffort: "medium",
				},
			],
		});

		expect(settings.stages.map((stage) => stage.id)).toEqual([
			"brainstorm",
			"plan",
			"implement",
			"testing",
		]);
		expect(requests[0]).toMatchObject({
			url: "/api/settings/models",
			method: "GET",
		});
		expect(requests[1]).toMatchObject({
			url: "/api/settings/models",
			method: "PATCH",
			body: JSON.stringify({
				stages: [
					{
						id: "testing",
						model: "gpt-5.3-codex",
						reasoningEffort: "medium",
					},
				],
			}),
		});
	});

	it("reads and updates GitHub workflow instructions", async () => {
		const requests: Array<{ method?: string; url: string; body?: string }> = [];
		const client = createApiClient({
			fetchFn: (async (url, init) => {
				requests.push({
					url: String(url),
					method: init?.method,
					body: init?.body?.toString(),
				});
				return Response.json({
					commitInstruction: "commit {issueKey}: {issueTitle}",
					prInstruction: "PR for {issueKey} from {branch}",
				});
			}) as typeof fetch,
		});

		const settings = await client.getGitHubSettings();
		await client.updateGitHubSettings({
			commitInstruction: "ship {issueKey}: {issueTitle}",
			prInstruction: "Open PR from {branch} into {baseBranch}",
		});

		expect(settings).toEqual({
			commitInstruction: "commit {issueKey}: {issueTitle}",
			prInstruction: "PR for {issueKey} from {branch}",
		});
		expect(requests[0]).toMatchObject({
			url: "/api/settings/github",
			method: "GET",
		});
		expect(requests[1]).toMatchObject({
			url: "/api/settings/github",
			method: "PATCH",
			body: JSON.stringify({
				commitInstruction: "ship {issueKey}: {issueTitle}",
				prInstruction: "Open PR from {branch} into {baseBranch}",
			}),
		});
	});
});
