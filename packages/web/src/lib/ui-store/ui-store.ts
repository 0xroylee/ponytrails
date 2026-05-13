"use client";

import { create } from "zustand";

import type {
	UiDraftState,
	UiModalState,
	UiStore,
	UiStoreState,
	UiViewFilters,
} from "./ui-store.types";

const defaultViewFilters: UiViewFilters = {
	status: "all",
	searchQuery: "",
	assignedAgentId: null,
	sortOrder: "newest",
};

const defaultDrafts: UiDraftState = {
	runNotesDraft: "",
	commandInputDraft: "",
};

const defaultModalState: UiModalState = {
	kind: null,
};

const createDefaultState = (): UiStoreState => ({
	selectedWorkspaceId: null,
	viewFilters: defaultViewFilters,
	drafts: defaultDrafts,
	modal: defaultModalState,
});

const defaultState = createDefaultState();

export const useUiStore = create<UiStore>((set) => ({
	...defaultState,
	setSelectedWorkspaceId: (workspaceId) => {
		set({ selectedWorkspaceId: workspaceId });
	},
	updateViewFilters: (partial) => {
		set((state) => ({ viewFilters: { ...state.viewFilters, ...partial } }));
	},
	resetViewFilters: () => {
		set({ viewFilters: defaultViewFilters });
	},
	updateDrafts: (partial) => {
		set((state) => ({ drafts: { ...state.drafts, ...partial } }));
	},
	clearDrafts: () => {
		set({ drafts: defaultDrafts });
	},
	openModal: (kind, contextId = null) => {
		set({ modal: { kind, contextId } });
	},
	closeModal: () => {
		set({ modal: defaultModalState });
	},
	resetUiState: () => {
		set(createDefaultState());
	},
}));
