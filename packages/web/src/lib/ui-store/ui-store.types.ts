export type WorkspaceId = string;

export type AgentRunStatusFilter =
	| "all"
	| "queued"
	| "running"
	| "succeeded"
	| "failed";
export type RunSortOrder = "newest" | "oldest";

export interface UiViewFilters {
	status: AgentRunStatusFilter;
	searchQuery: string;
	assignedAgentId: string | null;
	sortOrder: RunSortOrder;
}

export interface UiDraftState {
	runNotesDraft: string;
	commandInputDraft: string;
}

export type UiModalKind = "createRun" | "cancelRun" | "editWorkspace";

export type UiModalState =
	| {
			kind: null;
	  }
	| {
			kind: UiModalKind;
			contextId: string | null;
	  };

export interface UiStoreState {
	selectedWorkspaceId: WorkspaceId | null;
	viewFilters: UiViewFilters;
	drafts: UiDraftState;
	modal: UiModalState;
}

export interface UiStoreActions {
	setSelectedWorkspaceId(workspaceId: WorkspaceId | null): void;
	updateViewFilters(partial: Partial<UiViewFilters>): void;
	resetViewFilters(): void;
	updateDrafts(partial: Partial<UiDraftState>): void;
	clearDrafts(): void;
	openModal(kind: UiModalKind, contextId?: string | null): void;
	closeModal(): void;
	resetUiState(): void;
}

export type UiStore = UiStoreState & UiStoreActions;
