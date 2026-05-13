import { useUiStore } from "./ui-store";
import type { UiStoreState } from "./ui-store.types";

const selectedWorkspaceId: UiStoreState["selectedWorkspaceId"] =
	useUiStore.getState().selectedWorkspaceId;

useUiStore.getState().setSelectedWorkspaceId(selectedWorkspaceId);
useUiStore.getState().updateViewFilters({
	status: "running",
	searchQuery: "query",
	sortOrder: "oldest",
	assignedAgentId: "agent-1",
});
useUiStore.getState().updateDrafts({
	runNotesDraft: "note",
	commandInputDraft: "bun test",
});
useUiStore.getState().openModal("createRun", "workspace-1");
useUiStore.getState().closeModal();
useUiStore.getState().resetViewFilters();
useUiStore.getState().clearDrafts();
useUiStore.getState().resetUiState();
