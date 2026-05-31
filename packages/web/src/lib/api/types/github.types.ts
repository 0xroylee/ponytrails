export interface GitHubConnectionResponse {
	isConfigured: boolean;
	isConnected: boolean;
	login: string | null;
	unavailableReason: string | null;
}

export interface GitHubRepositoryRecord {
	id: string;
	owner: string;
	name: string;
	nameWithOwner: string;
	defaultBranch: string | null;
	isPrivate: boolean;
}

export interface GitHubRepositoriesResponse {
	isAvailable: boolean;
	unavailableReason: string | null;
	repositories: GitHubRepositoryRecord[];
}
