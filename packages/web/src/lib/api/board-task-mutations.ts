"use client";

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { ProjectBoardTaskRecord } from "./client.types";
import type {
	BoardTaskMutationInput,
	BoardTaskUpdateMutationInput,
} from "./queries.types";
import { serverStateQueryKeys } from "./query-keys";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export function useCreateBoardTaskMutation(): UseMutationResult<
	ProjectBoardTaskRecord,
	Error,
	BoardTaskMutationInput
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["board-task", "create"] as const,
		mutationFn: (input) => apiClient.createBoardTask(input),
		onSuccess: async (updatedTask) => {
			queryClient.setQueryData<ProjectBoardTaskRecord>(
				serverStateQueryKeys.boardTask(updatedTask.id),
				updatedTask,
			);
			queryClient.setQueryData<ProjectBoardTaskRecord[] | undefined>(
				serverStateQueryKeys.boardTasks,
				(current) =>
					current?.map((task) =>
						task.id === updatedTask.id ? updatedTask : task,
					),
			);
			await queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.boardTasks,
			});
			await queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.boardTask(updatedTask.id),
			});
		},
	});
}

export function useUpdateBoardTaskMutation(): UseMutationResult<
	ProjectBoardTaskRecord,
	Error,
	BoardTaskUpdateMutationInput
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["board-task", "update"] as const,
		mutationFn: (input) => apiClient.updateBoardTask(input.taskId, input.task),
		onSuccess: async (_updatedTask, input) => {
			await queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.boardTasks,
			});
			await queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.taskActivity(input.taskId),
			});
		},
	});
}

export function useDeleteBoardTaskMutation(): UseMutationResult<
	ProjectBoardTaskRecord,
	Error,
	string
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["board-task", "delete"] as const,
		mutationFn: (taskId) => apiClient.deleteBoardTask(taskId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.boardTasks,
			});
		},
	});
}
