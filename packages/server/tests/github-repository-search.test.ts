import { describe, expect, it } from "bun:test";
import { searchGitHubRepositories } from "../src/github";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("GitHub repository search service", () => {
	it("maps GitHub repository search results into stable records", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe(
				"https://api.github.com/search/repositories?q=show-me-ur-agents&per_page=8",
			);
			expect(init?.headers).toBeInstanceOf(Headers);
			expect((init?.headers as Headers).get("accept")).toBe(
				"application/vnd.github+json",
			);
			return jsonResponse({
				items: [
					{
						id: 7,
						owner: { login: "devos" },
						name: "show-me-ur-agents",
						full_name: "devos/show-me-ur-agents",
						html_url: "https://github.com/devos/show-me-ur-agents",
						clone_url: "https://github.com/devos/show-me-ur-agents.git",
						default_branch: "main",
						description: "Agent workflow UI",
						private: false,
					},
				],
			});
		}) as typeof fetch;

		const result = await searchGitHubRepositories({
			query: " show-me-ur-agents ",
			fetchFn,
		});

		expect(result).toEqual({
			status: "ok",
			repositories: [
				{
					id: "7",
					owner: "devos",
					name: "show-me-ur-agents",
					fullName: "devos/show-me-ur-agents",
					htmlUrl: "https://github.com/devos/show-me-ur-agents",
					cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
					defaultBranch: "main",
					description: "Agent workflow UI",
					isPrivate: false,
				},
			],
		});
	});

	it("returns stable statuses for validation, auth, rate limit, and upstream failures", async () => {
		expect(await searchGitHubRepositories({ query: " " })).toEqual({
			status: "invalid_query",
		});

		const unauthorizedFetch = (async () =>
			jsonResponse({ message: "Bad credentials" }, 401)) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: unauthorizedFetch,
			}),
		).toEqual({ status: "auth_unavailable" });

		const rateLimitedFetch = (async () =>
			jsonResponse({ message: "rate limited" }, 403)) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: rateLimitedFetch,
			}),
		).toEqual({ status: "rate_limited" });

		const failingFetch = (async () => {
			throw new Error("network down");
		}) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: failingFetch,
			}),
		).toEqual({ status: "upstream_error" });
	});
});
