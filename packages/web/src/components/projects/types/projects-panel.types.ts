import type { WorkspaceProjectRecord } from "@/lib/api";
import type { GitHubConnectionResponse } from "@/lib/api/types/client.types";

export type ProjectRepositoryMode = "select" | "manual";

export interface ProjectFormState {
	name: string;
	emoji: string;
	description: string;
	repositoryMode: ProjectRepositoryMode;
	selectedRepository: string;
	manualRepository: string;
	lead: string;
	priority: string;
}

export interface ProjectCreateDefaults {
	boardId: string;
	ownerId: string;
}

export type ProjectTableDensity = "compact" | "comfortable";

export interface ProjectDisplayRow {
	project: WorkspaceProjectRecord;
	emojiLabel: string;
	priorityLabel: string;
	categoryLabel: string;
	repositoryLabel: string;
	leadLabel: string;
	createdLabel: string;
	summaryLabel: string;
}

export interface RepositorySelectorStateInput {
	connection: GitHubConnectionResponse | undefined;
	hasRepositoryOptions: boolean;
	isConnectionError: boolean;
	isConnectionLoading: boolean;
	isRepositoryLoading: boolean;
	isRepositoryError: boolean;
	repositoryUnavailableReason: string | null;
}

export interface RepositorySelectorState {
	canSelectRepository: boolean;
	shouldShowConnect: boolean;
	shouldShowRetry: boolean;
	statusMessage: string | null;
}
