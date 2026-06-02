"use client";

import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { serverStateQueryKeys } from "./query-keys";
import type {
	AgentRecord,
	CommandHistoryRecord,
	CurrentWorkspaceRecord,
	JobRecord,
	ProjectBoardTaskRecord,
	SettingsGithubResponse,
	SettingsModelsResponse,
	SkillRecord,
	TokenUsageRecord,
	WorkspaceEnvironmentResponse,
} from "./types/client.types";
import type { PollingStatusResponse } from "./types/polling-status.types";
import type {
	AgentUpdateMutationInput,
	ServerStateQueryOptions,
} from "./types/queries.types";
import type { WorkflowComputerRecord } from "./types/workflow-computer.types";
import { createWebApiClient } from "./web-client";

export {
	useCreateBoardTaskMutation,
	useDeleteBoardTaskMutation,
	useUpdateBoardTaskMutation,
} from "./board-task-mutations";
export {
	useCreateProjectMutation,
	useUpdateProjectMutation,
} from "./project-mutations";
export { useGitHubRepositorySearchQuery } from "./github-queries";
export { serverStateQueryKeys } from "./query-keys";
export {
	settingsMutationKeys,
	useUpdateGitHubSettingsMutation,
	useUpdateModelSettingsMutation,
} from "./settings-mutations";
export {
	taskCreationMutationKeys,
	useCreateTaskMutation,
} from "./task-creation-mutations";

const apiClient = createWebApiClient();
const DEFAULT_POLL_INTERVAL_MS = 5000;

export const agentMutationKeys = {
	updateAgent: ["agents", "update-agent"] as const,
};

export function useTokenUsageQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<TokenUsageRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.tokenUsage,
		queryFn: () => apiClient.listTokenUsage(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useJobsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<JobRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.jobs,
		queryFn: () => apiClient.listJobs(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useAgentsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<AgentRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.agents,
		queryFn: () => apiClient.listAgents(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useSkillsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<SkillRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.skills,
		queryFn: () => apiClient.listSkills(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useCurrentWorkspaceQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<CurrentWorkspaceRecord, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.currentWorkspace,
		queryFn: () => apiClient.getCurrentWorkspace(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useWorkspaceEnvironmentQuery(
	projectId?: string | null,
	options?: ServerStateQueryOptions,
): UseQueryResult<WorkspaceEnvironmentResponse, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.workspaceEnvironment(projectId ?? null),
		queryFn: () => apiClient.getWorkspaceEnvironment(projectId ?? undefined),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useUpdateAgentMutation(): UseMutationResult<
	AgentRecord,
	Error,
	AgentUpdateMutationInput
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: agentMutationKeys.updateAgent,
		mutationFn: ({ agentId, agent }) => apiClient.updateAgent(agentId, agent),
		onSuccess: (updatedAgent) => {
			queryClient.setQueryData<AgentRecord[] | undefined>(
				serverStateQueryKeys.agents,
				(current) =>
					current?.map((agent) =>
						agent.id === updatedAgent.id ? updatedAgent : agent,
					),
			);
			queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.agents,
			});
		},
	});
}

export function useCommandHistoryQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<CommandHistoryRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.commandHistory,
		queryFn: () => apiClient.listCommandHistory(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useWorkflowComputersQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<WorkflowComputerRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.workflowComputers,
		queryFn: () => apiClient.listWorkflowComputers(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function usePollingStatusQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<PollingStatusResponse, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.pollingStatus,
		queryFn: () => apiClient.listPollingStatus(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useModelSettingsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<SettingsModelsResponse, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.modelSettings,
		queryFn: () => apiClient.getModelSettings(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useGitHubSettingsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<SettingsGithubResponse, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.gitHubSettings,
		queryFn: () => apiClient.getGitHubSettings(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useBoardTasksQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<ProjectBoardTaskRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.boardTasks,
		queryFn: () => apiClient.listBoardTasks(),
		enabled: options?.enabled,
		refetchInterval: resolveRefetchInterval(options),
	});
}

export function useBoardTaskQuery(
	taskId: string,
	options?: ServerStateQueryOptions,
): UseQueryResult<ProjectBoardTaskRecord, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.boardTask(taskId),
		queryFn: () => apiClient.getBoardTask(taskId),
		enabled: Boolean(taskId) && options?.enabled !== false,
		refetchInterval: resolveRefetchInterval(options),
	});
}

function resolveRefetchInterval(
	options?: ServerStateQueryOptions,
): number | false {
	return options?.refetchIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
}
