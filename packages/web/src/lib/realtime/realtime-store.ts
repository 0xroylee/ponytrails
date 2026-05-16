"use client";

import { create } from "zustand";
import type {
	RealtimeEvent,
	RealtimeIssueEvent,
	RealtimeProjectEvent,
} from "./realtime-events.types";
import type { RealtimeStore, RealtimeStoreState } from "./realtime-store.types";

const createDefaultState = (): RealtimeStoreState => ({
	status: "idle",
	lastError: null,
	lastEvent: null,
	issuesById: {},
	projectsById: {},
	inboxMessagesByScope: {},
});

export const useRealtimeStore = create<RealtimeStore>((set) => ({
	...createDefaultState(),
	setConnectionStatus: (status) => {
		set({ status });
	},
	setConnectionError: (error) => {
		set({ lastError: error });
	},
	applyEvent: (event) => {
		set((state) => applyRealtimeEvent(state, event));
	},
	resetRealtimeState: () => {
		set(createDefaultState());
	},
}));

export function inboxScopeKey(scope: {
	workspaceId: string;
	userId: string;
	runId: string;
}): string {
	return `${scope.workspaceId}:${scope.userId}:${scope.runId}`;
}

export function applyRealtimeEvent(
	state: RealtimeStoreState,
	event: RealtimeEvent,
): RealtimeStoreState {
	if (event.type === "issue.deleted") {
		const { [event.issue.id]: _removed, ...issuesById } = state.issuesById;
		return { ...state, lastEvent: event, issuesById };
	}
	if (isIssueEvent(event)) {
		return {
			...state,
			lastEvent: event,
			issuesById: { ...state.issuesById, [event.issue.id]: event.issue },
		};
	}
	if (event.type === "project.deleted") {
		const { [event.project.id]: _removed, ...projectsById } =
			state.projectsById;
		return { ...state, lastEvent: event, projectsById };
	}
	if (isProjectEvent(event)) {
		return {
			...state,
			lastEvent: event,
			projectsById: {
				...state.projectsById,
				[event.project.id]: event.project,
			},
		};
	}
	if (event.type === "task.execution.event") {
		return { ...state, lastEvent: event };
	}
	const key = inboxScopeKey(event.message);
	return {
		...state,
		lastEvent: event,
		inboxMessagesByScope: {
			...state.inboxMessagesByScope,
			[key]: upsertLatestMessage(
				state.inboxMessagesByScope[key] ?? [],
				event.message,
			),
		},
	};
}

function isIssueEvent(event: RealtimeEvent): event is RealtimeIssueEvent {
	return event.type.startsWith("issue.");
}

function isProjectEvent(event: RealtimeEvent): event is RealtimeProjectEvent {
	return event.type.startsWith("project.");
}

function upsertLatestMessage<T extends { id: string }>(
	items: T[],
	item: T,
): T[] {
	return [item, ...items.filter((current) => current.id !== item.id)];
}
