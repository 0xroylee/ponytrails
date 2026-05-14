"use client";

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type {
	AgentRecord,
	CommandHistoryRecord,
	JobRecord,
	ProjectBoardRecord,
	SkillRecord,
	TokenUsageRecord,
	WorkspaceProjectRecord,
} from "./client.types";
import type {
	ProjectBoardQueryOptions,
	ServerStateQueryOptions,
	WorkspaceProjectsQueryOptions,
} from "./queries.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export const serverStateQueryKeys = {
	tokenUsage: ["server-state", "token-usage"] as const,
	jobs: ["server-state", "jobs"] as const,
	agents: ["server-state", "agents"] as const,
	skills: ["server-state", "skills"] as const,
	commandHistory: ["server-state", "command-history"] as const,
	workspaceProjects: (workspaceId: string | null) =>
		["server-state", "workspace-projects", workspaceId] as const,
	projectBoard: (workspaceId: string | null, projectId: string | null) =>
		["server-state", "project-board", workspaceId, projectId] as const,
};

export function useTokenUsageQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<TokenUsageRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.tokenUsage,
		queryFn: () => apiClient.listTokenUsage(),
		enabled: options?.enabled,
	});
}

export function useJobsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<JobRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.jobs,
		queryFn: () => apiClient.listJobs(),
		enabled: options?.enabled,
	});
}

export function useAgentsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<AgentRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.agents,
		queryFn: () => apiClient.listAgents(),
		enabled: options?.enabled,
	});
}

export function useSkillsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<SkillRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.skills,
		queryFn: () => apiClient.listSkills(),
		enabled: options?.enabled,
	});
}

export function useCommandHistoryQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<CommandHistoryRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.commandHistory,
		queryFn: () => apiClient.listCommandHistory(),
		enabled: options?.enabled,
	});
}

export function useWorkspaceProjectsQuery(
	options: WorkspaceProjectsQueryOptions,
): UseQueryResult<WorkspaceProjectRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.workspaceProjects(options.workspaceId),
		queryFn: () =>
			apiClient.listWorkspaceProjects(options.workspaceId as string),
		enabled: Boolean(options.workspaceId) && options.enabled !== false,
	});
}

export function useProjectBoardQuery(
	options: ProjectBoardQueryOptions,
): UseQueryResult<ProjectBoardRecord, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.projectBoard(
			options.workspaceId,
			options.projectId,
		),
		queryFn: () =>
			apiClient.getProjectBoard(
				options.workspaceId as string,
				options.projectId as string,
			),
		enabled:
			Boolean(options.workspaceId) &&
			Boolean(options.projectId) &&
			options.enabled !== false,
	});
}
