"use client";

import { useUiStore } from "@/lib/ui-store";
import type { ReactElement } from "react";
import { ChatActionStatusView } from "./chat-action-status-view";
import { ChatClarificationComposer } from "./chat-clarification-composer";
import { ChatComposer } from "./chat-composer";
import { ChatComposerSkeleton } from "./chat-composer-skeleton";
import { ChatRoomHeader } from "./chat-room-header";
import {
	shouldShowChatRoomLoadingShell,
	shouldShowMissionProgressSkeleton,
} from "./chat-room-loading-state";
import { resolveChatRoomPanelLayout } from "./chat-room-panel-layout";
import { ChatTaskDetailView } from "./chat-task-detail-view";
import { ChatTranscript } from "./chat-transcript";
import { ChatNoSessionHome } from "./chat-welcome-states";
import type { ChatRoomPanelViewProps } from "./types/chat-room.types";
import { useMinimumChatRoomLoadingShell } from "./use-minimum-chat-room-loading-shell";

export function ChatRoomPanelView({
	activeContentMode,
	activeTaskId,
	draft,
	hasMessagesCache,
	isBusy,
	isMessagesLoading,
	isRerunDisabled,
	isRerunning,
	isRerunVisible,
	isSending,
	isPlanning,
	isThinking,
	missionProgress,
	messages,
	messagesError,
	pendingAnswers,
	pendingQuestionIndex,
	selectedSession,
	streamLines,
	workingStartedAt,
	onAnswerChange,
	onDraftChange,
	onOpenAction,
	onOpenMessages,
	onOpenSidebar,
	onOpenTaskDetails,
	onRerunWorkflow,
	onSelectCommand,
	onSelectOption,
	onSubmit,
	onSubmitAnswers,
}: ChatRoomPanelViewProps): ReactElement {
	const messageInputFocusRequest = useUiStore(
		(state) => state.messageInputFocusRequest,
	);
	const clearMessageInputFocusRequest = useUiStore(
		(state) => state.clearMessageInputFocusRequest,
	);
	const pendingQuestions = selectedSession?.pendingQuestions ?? [];
	const hasPendingQuestions = pendingQuestions.length > 0;
	const messageInputFocusRequestId =
		messageInputFocusRequest &&
		messageInputFocusRequest.sessionId === selectedSession?.id
			? messageInputFocusRequest.id
			: null;
	const layout = resolveChatRoomPanelLayout({
		activeContentMode,
		hasActiveTask: Boolean(activeTaskId),
	});
	const isRealtimeActive =
		Boolean(workingStartedAt) || isPlanning || isThinking;
	const rawShowLoadingShell = shouldShowChatRoomLoadingShell({
		hasMessagesCache,
		hasSelectedSession: Boolean(selectedSession),
		isMessagesLoading,
	});
	const showLoadingShell = useMinimumChatRoomLoadingShell(
		rawShowLoadingShell,
		selectedSession?.id ?? null,
	);
	const showMissionSkeleton = shouldShowMissionProgressSkeleton({
		hasActiveTask: Boolean(activeTaskId),
		isChatRoomLoading: showLoadingShell || isRealtimeActive,
	});

	return (
		<section className={layout.rootClassName}>
			{selectedSession ? (
				<div className={layout.sessionClassName}>
					<ChatRoomHeader
						activeTaskId={activeTaskId}
						activeTab={layout.contentMode}
						isRerunDisabled={isRerunDisabled}
						isRerunning={isRerunning}
						isRerunVisible={isRerunVisible}
						title={selectedSession.title}
						onOpenAction={onOpenAction}
						onOpenMessages={onOpenMessages}
						onOpenSidebar={onOpenSidebar}
						onOpenTaskDetails={onOpenTaskDetails}
						onRerunWorkflow={onRerunWorkflow}
					/>
					{layout.contentMode === "taskDetails" ? (
						<ChatTaskDetailView
							contentWidthClassName={layout.contentWidthClassName}
							taskId={activeTaskId}
						/>
					) : layout.contentMode === "action" ? (
						<ChatActionStatusView
							contentWidthClassName={layout.contentWidthClassName}
							missionProgress={missionProgress}
							showMissionSkeleton={showMissionSkeleton}
						/>
					) : (
						<>
							<ChatTranscript
								contentWidthClassName={layout.contentWidthClassName}
								error={messagesError}
								isLoading={showLoadingShell}
								isPlanning={isPlanning}
								isThinking={isThinking}
								missionProgress={missionProgress}
								messages={messages}
								showMissionPanel={layout.showMissionPanelInTranscript}
								showMissionSkeleton={showMissionSkeleton}
								session={selectedSession}
								streamLines={streamLines}
								workingStartedAt={workingStartedAt}
								onDraftCommand={onSelectCommand}
							/>
							{showLoadingShell ? (
								<ChatComposerSkeleton
									contentWidthClassName={layout.contentWidthClassName}
								/>
							) : hasPendingQuestions ? (
								<ChatClarificationComposer
									answers={pendingAnswers}
									contentWidthClassName={layout.contentWidthClassName}
									disabled={isBusy || isSending}
									pendingQuestionIndex={pendingQuestionIndex}
									questions={pendingQuestions}
									onAnswerChange={onAnswerChange}
									onSelectOption={onSelectOption}
									onSubmit={onSubmitAnswers}
								/>
							) : (
								<ChatComposer
									contentWidthClassName={layout.contentWidthClassName}
									disabled={isBusy}
									draft={draft}
									isSending={isSending}
									messageInputFocusRequestId={messageInputFocusRequestId}
									onDraftChange={onDraftChange}
									onMessageInputFocusRequestHandled={
										clearMessageInputFocusRequest
									}
									onSelectCommand={onSelectCommand}
									onSubmit={onSubmit}
								/>
							)}
						</>
					)}
				</div>
			) : (
				<ChatNoSessionHome
					disabled={isBusy}
					draft={draft}
					isSending={isSending}
					onDraftChange={onDraftChange}
					onOpenSidebar={onOpenSidebar}
					onSelectCommand={onSelectCommand}
					onSubmit={onSubmit}
				/>
			)}
		</section>
	);
}
