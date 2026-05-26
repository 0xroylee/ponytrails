"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";

import {
	useAppendChatMessageMutation,
	useChatMessagesQuery,
	useChatSessionsQuery,
	useCreateChatSessionMutation,
	useSendChatMessageMutation,
	useUpdateChatSessionMutation,
} from "@/lib/api/chat-queries";
import { useCurrentWorkspaceQuery } from "@/lib/api/queries";
import { useWorkspaceProjectsQuery } from "@/lib/api/realtime-queries";
import { useRealtimeStore } from "@/lib/realtime";

import { useChatClarificationState } from "./chat-clarification-state";
import { createChatClarificationSubmitters } from "./chat-clarification-submitters";
import { parseChatCommand } from "./chat-command-utils";
import { executeCommandInput } from "./chat-room-command-actions";
import { useChatRoomMission } from "./chat-room-mission";
import { useChatRoomDraftState } from "./chat-room-panel-draft-state";
import { ChatRoomPanelView } from "./chat-room-panel-view";
import { selectChatSession } from "./chat-room-selection";
import { updateChatRoomSessionState } from "./chat-room-session-updates";
import { chatStreamLinesForSession } from "./chat-room-stream-utils";
import { shouldShowChatThinkingIndicator } from "./chat-thinking-state";
import { useWorkingSectionState } from "./chat-working-section-state";
import type * as CRT from "./types/chat-room.types";

const SIDEBAR_CONTROL_ID = "chat-sidebar-toggle";
const NO_REFETCH = { refetchIntervalMs: false } as const;

export function ChatRoomPanel({
	commandDraftRequest,
	newSessionRequest,
	onSearchRequest,
}: CRT.ChatRoomPanelProps): ReactElement {
	const [activeSessionId, setActiveSessionId] = useState("");
	const [draft, setDraft] = useState("");
	const [commandLines, setCommandLines] = useState<CRT.ChatStreamLine[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isTaskDetailSheetOpen, setIsTaskDetailSheetOpen] = useState(false);
	const clarificationState = useChatClarificationState();
	const handledNewSessionRequest = useRef(0);
	const sidebarToggleRef = useRef<HTMLInputElement>(null);
	const { runWithWorkingLabel, workingStartedAt } = useWorkingSectionState();
	const { handleDraftChange, markCommandDraftHandled } = useChatRoomDraftState({
		commandDraftRequest,
		setDraft,
		setErrorMessage,
	});
	const currentWorkspaceQuery = useCurrentWorkspaceQuery(NO_REFETCH);
	const workspaceId = currentWorkspaceQuery.data?.workspaceId ?? "";
	const sessionsQuery = useChatSessionsQuery(workspaceId, NO_REFETCH);
	const projectsQuery = useWorkspaceProjectsQuery(workspaceId, NO_REFETCH);
	const createSession = useCreateChatSessionMutation();
	const updateSession = useUpdateChatSessionMutation();
	const appendMessage = useAppendChatMessageMutation();
	const sendMessage = useSendChatMessageMutation();
	const sessions = sessionsQuery.data ?? [];
	const { selectedSession, selectedSessionId } = selectChatSession(
		sessions,
		activeSessionId,
	);
	const messagesQuery = useChatMessagesQuery(selectedSessionId, {
		enabled: Boolean(selectedSessionId),
		refetchIntervalMs: false,
	});
	const messages = messagesQuery.data ?? [];
	const { activeTaskId, missionProgress } = useChatRoomMission(
		selectedSession,
		messages,
	);
	const { pendingAnswers, pendingQuestionIndex } =
		clarificationState.readPending(selectedSessionId);
	const chatStreamsByRunId = useRealtimeStore(
		(state) => state.chatStreamsByRunId,
	);
	const streamLines = [
		...commandLines,
		...chatStreamLinesForSession(chatStreamsByRunId, selectedSessionId),
	];
	const isThinking = shouldShowChatThinkingIndicator({
		isSending: sendMessage.isPending,
		selectedSessionId,
		sendingSessionId: sendMessage.variables?.sessionId,
		streamLineCount: streamLines.length,
	});
	const mutationBusy =
		createSession.isPending ||
		updateSession.isPending ||
		appendMessage.isPending ||
		sendMessage.isPending;
	const isBusy = currentWorkspaceQuery.isLoading || mutationBusy;
	const clarificationSubmitters = createChatClarificationSubmitters({
		clarificationState,
		pendingAnswers,
		pendingQuestionIndex,
		runWithWorkingLabel,
		selectedSession,
		sendMessage: (input) => sendMessage.mutateAsync(input),
	});
	useEffect(() => {
		if (
			newSessionRequest <= 0 ||
			newSessionRequest === handledNewSessionRequest.current ||
			!workspaceId
		) {
			return;
		}
		handledNewSessionRequest.current = newSessionRequest;
		void startNewSession();
	}, [newSessionRequest, workspaceId]);
	async function startNewSession(closeSidebar = false): Promise<void> {
		setErrorMessage(null);
		if (!workspaceId) {
			setErrorMessage("Workspace is still loading.");
			return;
		}
		const session = await createSession.mutateAsync({ workspaceId });
		setActiveSessionId(session.id);
		setDraft("");
		if (closeSidebar) closeMobileSidebar();
	}
	function closeMobileSidebar(): void {
		if (sidebarToggleRef.current) sidebarToggleRef.current.checked = false;
	}
	async function ensureSession() {
		if (selectedSession) return selectedSession;
		if (!workspaceId) throw new Error("Workspace is still loading.");
		const session = await createSession.mutateAsync({ workspaceId });
		setActiveSessionId(session.id);
		return session;
	}

	async function handleSubmit(): Promise<void> {
		const content = draft.trim();
		if (!content || isBusy) return;
		markCommandDraftHandled();
		setDraft("");
		setErrorMessage(null);
		try {
			await runWithWorkingLabel(async () => {
				const session = await ensureSession();
				const command = parseChatCommand(content, {
					projectId: session.projectId,
				});
				await executeInput(session.id, content, command);
			});
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Send failed");
		}
	}
	async function executeInput(
		sessionId: string,
		content: string,
		command: ReturnType<typeof parseChatCommand>,
	): Promise<void> {
		if (command.kind === "none") {
			await sendMessage.mutateAsync({ sessionId, message: { content } });
			return;
		}
		await executeCommandInput(
			{
				appendMessage: (input) => appendMessage.mutateAsync(input),
				setStreamLines: setCommandLines,
				startNewSession,
				updateProject: ({ sessionId: targetSessionId, projectId }) =>
					updateSession.mutateAsync({
						sessionId: targetSessionId,
						session: { projectId },
					}),
			},
			sessionId,
			content,
			command,
		);
	}
	async function updateSessionState(
		sessionId: string,
		session: { archived?: boolean; pinned?: boolean },
		failureMessage: string,
	): Promise<void> {
		return updateChatRoomSessionState({
			failureMessage,
			mutateSession: updateSession.mutateAsync,
			selectedSessionId,
			session,
			sessionId,
			setActiveSessionId,
			setErrorMessage,
		});
	}
	return (
		<ChatRoomPanelView
			activeSessionId={selectedSessionId}
			activeTaskId={activeTaskId}
			draft={draft}
			errorMessage={errorMessage}
			isBusy={isBusy}
			isCreatingSession={createSession.isPending}
			isMessagesLoading={messagesQuery.isLoading}
			isSending={sendMessage.isPending}
			isTaskDetailSheetOpen={isTaskDetailSheetOpen}
			isThinking={isThinking}
			missionProgress={missionProgress}
			messages={messages}
			messagesError={messagesQuery.error}
			pendingAnswers={pendingAnswers}
			pendingQuestionIndex={pendingQuestionIndex}
			projects={projectsQuery.data ?? []}
			selectedSession={selectedSession}
			sidebarControlId={SIDEBAR_CONTROL_ID}
			sidebarToggleRef={sidebarToggleRef}
			sessions={sessions}
			streamLines={streamLines}
			workingStartedAt={workingStartedAt}
			onAnswerChange={(index, value) =>
				clarificationState.updateAnswerDraft(selectedSessionId, index, value)
			}
			onArchiveSession={(sessionId) =>
				void updateSessionState(sessionId, { archived: true }, "Archive failed")
			}
			onCloseSidebar={closeMobileSidebar}
			onCloseTaskDetails={() => setIsTaskDetailSheetOpen(false)}
			onDraftChange={handleDraftChange}
			onNewSession={() => void startNewSession(true)}
			onOpenTaskDetails={() => setIsTaskDetailSheetOpen(true)}
			onPinSession={(sessionId, pinned) =>
				void updateSessionState(sessionId, { pinned }, "Pin update failed")
			}
			onSearch={() => {
				closeMobileSidebar();
				onSearchRequest();
			}}
			onSelectCommand={setDraft}
			onSelectOption={(index, value) =>
				void clarificationSubmitters.submitAnswerValue(index, value)
			}
			onSelectSession={(sessionId) => {
				setActiveSessionId(sessionId);
				closeMobileSidebar();
			}}
			onSubmit={() => void handleSubmit()}
			onSubmitAnswers={() => void clarificationSubmitters.submitAnswers()}
		/>
	);
}
