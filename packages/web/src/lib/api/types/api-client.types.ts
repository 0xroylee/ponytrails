import type {
	ChatMessageCreateRequest,
	ChatMessageRecord,
	ChatSendRequest,
	ChatSendResponse,
	ChatSessionCreateRequest,
	ChatSessionRecord,
	ChatSessionUpdateRequest,
} from "./chat.types";
import type {
	CliCommandStreamHandler,
	CliCommandStreamRequest,
} from "./command-stream-client.types";
import type { GitHubRepositorySearchResult } from "./github.types";
import type { PollingStatusResponse } from "./polling-status.types";
import type {
	ProjectCreateRequest,
	ProjectUpdateRequest,
	WorkspaceProjectRecord,
} from "./project.types";
import type {
	AgentRecord,
	AgentUpdateRequest,
	CommandHistoryRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./server-state.types";
import type {
	SettingsGithubResponse,
	SettingsGithubUpdateRequest,
	SettingsModelsResponse,
	SettingsModelsUpdateRequest,
} from "./settings.types";
import type { TaskActivityResponse } from "./task-activity.types";
import type {
	ProjectBoardRecord,
	ProjectBoardTaskRecord,
	TaskCreateRequest,
	TaskCreateResponse,
	TaskMutationRequest,
} from "./task.types";
import type { WorkflowComputerApiMethods } from "./workflow-computer.types";
import type { WorkspaceEnvironmentResponse } from "./workspace-environment.types";

export type HealthResponse = { status: "ok" };

export interface HealthRequestOptions {
	signal?: AbortSignal;
}

export interface CurrentWorkspaceRecord {
	workspaceId: string;
	name: string;
}

export interface InboxMessageScope {
	workspaceId: string;
	userId: string;
	runId: string;
}

export interface InboxMessageRecord extends InboxMessageScope {
	id: string;
	source: string;
	kind: string;
	body: string;
	taskId: string | null;
	agentId: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface ApiClientOptions {
	baseUrl?: string;
	wsUrl?: string;
	fetchFn?: typeof fetch;
	headers?: HeadersInit;
	WebSocketImpl?: typeof WebSocket;
}

export interface ApiClient extends WorkflowComputerApiMethods {
	getHealth(options?: HealthRequestOptions): Promise<HealthResponse>;
	getCurrentWorkspace(
		options?: HealthRequestOptions,
	): Promise<CurrentWorkspaceRecord>;
	getWorkspaceEnvironment(
		projectId?: string,
		options?: HealthRequestOptions,
	): Promise<WorkspaceEnvironmentResponse>;
	listTokenUsage(options?: HealthRequestOptions): Promise<TokenUsageRecord[]>;
	listJobs(options?: HealthRequestOptions): Promise<JobRecord[]>;
	listAgents(options?: HealthRequestOptions): Promise<AgentRecord[]>;
	updateAgent(
		agentId: string,
		request: AgentUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<AgentRecord>;
	listSkills(options?: HealthRequestOptions): Promise<SkillRecord[]>;
	listCommandHistory(
		options?: HealthRequestOptions,
	): Promise<CommandHistoryRecord[]>;
	listChatSessions(
		workspaceId: string,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord[]>;
	createChatSession(
		request: ChatSessionCreateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord>;
	updateChatSession(
		sessionId: string,
		request: ChatSessionUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSessionRecord>;
	listChatMessages(
		sessionId: string,
		options?: HealthRequestOptions,
	): Promise<ChatMessageRecord[]>;
	appendChatMessage(
		sessionId: string,
		request: ChatMessageCreateRequest,
		options?: HealthRequestOptions,
	): Promise<ChatMessageRecord>;
	sendChatMessage(
		sessionId: string,
		request: ChatSendRequest,
		options?: HealthRequestOptions,
	): Promise<ChatSendResponse>;
	listPollingStatus(
		options?: HealthRequestOptions,
	): Promise<PollingStatusResponse>;
	getModelSettings(
		options?: HealthRequestOptions,
	): Promise<SettingsModelsResponse>;
	updateModelSettings(
		request: SettingsModelsUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<SettingsModelsResponse>;
	getGitHubSettings(
		options?: HealthRequestOptions,
	): Promise<SettingsGithubResponse>;
	updateGitHubSettings(
		request: SettingsGithubUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<SettingsGithubResponse>;
	listBoardTasks(
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord[]>;
	getBoardTask(
		taskId: string,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
	listTaskActivity(
		taskId: string,
		options?: HealthRequestOptions,
	): Promise<TaskActivityResponse>;
	listWorkspaceProjects(
		workspaceId: string,
		options?: HealthRequestOptions,
	): Promise<WorkspaceProjectRecord[]>;
	createProject(
		request: ProjectCreateRequest,
		options?: HealthRequestOptions,
	): Promise<WorkspaceProjectRecord>;
	updateProject(
		projectId: string,
		request: ProjectUpdateRequest,
		options?: HealthRequestOptions,
	): Promise<WorkspaceProjectRecord>;
	searchGitHubRepositories(
		query: string,
		options?: HealthRequestOptions,
	): Promise<GitHubRepositorySearchResult[]>;
	getProjectBoard(
		workspaceId: string,
		projectId: string,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardRecord>;
	listInboxMessages(
		scope: InboxMessageScope,
		options?: HealthRequestOptions,
	): Promise<InboxMessageRecord[]>;
	createTask(
		request: TaskCreateRequest,
		options?: HealthRequestOptions,
	): Promise<TaskCreateResponse>;
	streamCliCommand(
		request: CliCommandStreamRequest,
		onEvent: CliCommandStreamHandler,
		options?: HealthRequestOptions,
	): Promise<void>;
	createBoardTask(
		request: TaskMutationRequest,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
	updateBoardTask(
		taskId: string,
		request: Partial<TaskMutationRequest>,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
	deleteBoardTask(
		taskId: string,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
}
