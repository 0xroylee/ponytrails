"use client";

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { serverStateQueryKeys } from "./query-keys";
import type {
	SettingsModelsResponse,
	SettingsModelsUpdateRequest,
} from "./types/client.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export const settingsMutationKeys = {
	updateModelSettings: ["settings", "update-model-settings"] as const,
};

export function useUpdateModelSettingsMutation(): UseMutationResult<
	SettingsModelsResponse,
	Error,
	SettingsModelsUpdateRequest
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: settingsMutationKeys.updateModelSettings,
		mutationFn: (request) => apiClient.updateModelSettings(request),
		onSuccess: (settings) => {
			queryClient.setQueryData(serverStateQueryKeys.modelSettings, settings);
			queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.modelSettings,
			});
		},
	});
}
