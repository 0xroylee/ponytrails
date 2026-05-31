import type {
	GitHubRepositorySearchInput,
	GitHubRepositorySearchResult,
	GitHubRepositorySearchServiceResult,
} from "./types/github-repository-search.types";

const GITHUB_SEARCH_URL = "https://api.github.com/search/repositories";
const DEFAULT_LIMIT = 8;

export async function searchGitHubRepositories(
	input: GitHubRepositorySearchInput,
): Promise<GitHubRepositorySearchServiceResult> {
	const query = input.query.trim();
	if (!query) {
		return { status: "invalid_query" };
	}
	const fetchFn = input.fetchFn ?? fetch;
	const requestUrl = new URL(GITHUB_SEARCH_URL);
	requestUrl.searchParams.set("q", query);
	requestUrl.searchParams.set("per_page", String(input.limit ?? DEFAULT_LIMIT));

	const headers = new Headers({
		accept: "application/vnd.github+json",
		"user-agent": "devos-ing",
	});
	const token = input.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
	if (token) {
		headers.set("authorization", `Bearer ${token}`);
	}

	try {
		const response = await fetchFn(requestUrl.toString(), { headers });
		if (response.status === 401 || response.status === 404) {
			return { status: "auth_unavailable" };
		}
		if (response.status === 403 || response.status === 429) {
			return { status: "rate_limited" };
		}
		if (!response.ok) {
			return { status: "upstream_error" };
		}
		const payload = (await response.json()) as unknown;
		return {
			status: "ok",
			repositories: parseSearchPayload(payload),
		};
	} catch {
		return { status: "upstream_error" };
	}
}

function parseSearchPayload(payload: unknown): GitHubRepositorySearchResult[] {
	if (!isRecord(payload) || !Array.isArray(payload.items)) {
		return [];
	}
	return payload.items.flatMap((item) => {
		const parsed = parseRepositoryItem(item);
		return parsed ? [parsed] : [];
	});
}

function parseRepositoryItem(
	item: unknown,
): GitHubRepositorySearchResult | null {
	if (!isRecord(item) || !isRecord(item.owner)) {
		return null;
	}
	const id = item.id;
	const owner = item.owner.login;
	const name = item.name;
	const fullName = item.full_name;
	const htmlUrl = item.html_url;
	const cloneUrl = item.clone_url;
	const defaultBranch = item.default_branch;
	const description = item.description;
	const isPrivate = item.private;
	if (
		typeof owner !== "string" ||
		typeof name !== "string" ||
		typeof fullName !== "string" ||
		typeof htmlUrl !== "string" ||
		typeof cloneUrl !== "string" ||
		typeof defaultBranch !== "string" ||
		typeof isPrivate !== "boolean"
	) {
		return null;
	}
	return {
		id: String(id),
		owner,
		name,
		fullName,
		htmlUrl,
		cloneUrl,
		defaultBranch,
		description: typeof description === "string" ? description : null,
		isPrivate,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
