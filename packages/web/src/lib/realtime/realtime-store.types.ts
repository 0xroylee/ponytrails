import type {
	InboxMessageRecord,
	ProjectBoardTaskRecord,
	WorkspaceProjectRecord,
} from "../api";
import type {
	RealtimeConnectionStatus,
	RealtimeEvent,
} from "./realtime-events.types";

export interface RealtimeStoreState {
	status: RealtimeConnectionStatus;
	lastError: string | null;
	lastEvent: RealtimeEvent | null;
	issuesById: Record<string, ProjectBoardTaskRecord>;
	projectsById: Record<string, WorkspaceProjectRecord>;
	inboxMessagesByScope: Record<string, InboxMessageRecord[]>;
}

export interface RealtimeStoreActions {
	setConnectionStatus(status: RealtimeConnectionStatus): void;
	setConnectionError(error: string | null): void;
	applyEvent(event: RealtimeEvent): void;
	resetRealtimeState(): void;
}

export type RealtimeStore = RealtimeStoreState & RealtimeStoreActions;
