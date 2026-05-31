export interface GitHubRepositorySearchResult {
	id: string;
	owner: string;
	name: string;
	fullName: string;
	htmlUrl: string;
	cloneUrl: string;
	defaultBranch: string;
	description: string | null;
	isPrivate: boolean;
}

export interface GitHubRepositorySearchInput {
	query: string;
	fetchFn?: typeof fetch;
	token?: string | null;
	limit?: number;
}

export type GitHubRepositorySearchServiceResult =
	| { status: "ok"; repositories: GitHubRepositorySearchResult[] }
	| { status: "invalid_query" }
	| { status: "auth_unavailable" }
	| { status: "rate_limited" }
	| { status: "upstream_error" };
