import type { CommandDraftRequest } from "@/components/web-shell/types/operator-issue-actions.types";
import type {
	ChatMessageRecord,
	ChatSessionRecord,
	CliCommandStreamEvent,
	CliCommandStreamRequest,
	TaskClarificationQuestion,
	TaskCreateAnswer,
	WorkspaceProjectRecord,
} from "@/lib/api";
import type { RefObject } from "react";

export interface ChatRoomPanelProps {
	commandDraftRequest: CommandDraftRequest | null;
	newSessionRequest: number;
	onSearchRequest: () => void;
}

export interface ChatRoomHeaderProps {
	activeTaskId: string | null;
	projectId: string;
	sidebarControlId: string;
	title: string;
	onOpenTaskDetails: () => void;
}

export interface ChatCommandContext {
	projectId: string | null;
}

export type ParsedChatCommand =
	| { kind: "none" }
	| { kind: "local"; action: "new" }
	| { kind: "local"; action: "project"; projectId: string }
	| {
			kind: "stream";
			action: string;
			label: string;
			request: CliCommandStreamRequest;
	  }
	| { kind: "error"; error: string };

export interface ChatStreamLine {
	id: string;
	stream: "stdout" | "stderr" | "system";
	text: string;
}

export interface ChatTranscriptProps {
	error: Error | null;
	isLoading: boolean;
	isThinking: boolean;
	messages: ChatMessageRecord[];
	session: ChatSessionRecord | null;
	streamLines: ChatStreamLine[];
	workingStartedAt: string | null;
}

export interface ChatTaskDetailSheetProps {
	isOpen: boolean;
	taskId: string | null;
	onClose: () => void;
}

export interface ChatRoomPanelViewProps {
	activeSessionId: string;
	activeTaskId: string | null;
	draft: string;
	errorMessage: string | null;
	isBusy: boolean;
	isCreatingSession: boolean;
	isMessagesLoading: boolean;
	isSending: boolean;
	isTaskDetailSheetOpen: boolean;
	isThinking: boolean;
	messages: ChatMessageRecord[];
	messagesError: Error | null;
	pendingAnswers: string[];
	pendingQuestionIndex: number;
	projects: WorkspaceProjectRecord[];
	selectedSession: ChatSessionRecord | null;
	sidebarControlId: string;
	sidebarToggleRef: RefObject<HTMLInputElement | null>;
	sessions: ChatSessionRecord[];
	streamLines: ChatStreamLine[];
	workingStartedAt: string | null;
	onAnswerChange: (index: number, value: string) => void;
	onArchiveSession: (sessionId: string) => void;
	onCloseSidebar: () => void;
	onCloseTaskDetails: () => void;
	onDraftChange: (value: string) => void;
	onNewSession: () => void;
	onOpenTaskDetails: () => void;
	onSearch: () => void;
	onSelectCommand: (value: string) => void;
	onSelectOption: (index: number, value: string) => void;
	onSelectSession: (sessionId: string) => void;
	onSubmit: () => void;
	onSubmitAnswers: () => void;
}

export interface ChatComposerProps {
	disabled: boolean;
	draft: string;
	isSending: boolean;
	onDraftChange: (value: string) => void;
	onSelectCommand: (value: string) => void;
	onSubmit: () => void;
}

export interface ChatClarificationComposerProps {
	answers: string[];
	disabled: boolean;
	pendingQuestionIndex: number;
	questions: TaskClarificationQuestion[];
	onAnswerChange: (index: number, value: string) => void;
	onSelectOption: (index: number, value: string) => void;
	onSubmit: () => void;
}

export type ChatRoomSidebarView = "main" | "settings";

export interface ChatRoomSettingsSidebarProps {
	isActive: boolean;
	onBack: () => void;
	onClose: () => void;
	onNavigate: () => void;
}

export interface CommandRunResult {
	events: CliCommandStreamEvent[];
	status: "succeeded" | "failed" | "rejected";
}

export type ChatAnswerPayload = TaskCreateAnswer[];
