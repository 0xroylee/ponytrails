"use client";

import type { ReactElement } from "react";
import { ChatClarificationComposer } from "./chat-clarification-composer";
import { ChatComposer } from "./chat-composer";
import { ChatRoomHeader } from "./chat-room-header";
import { ChatRoomSidebar } from "./chat-room-sidebar";
import { ChatTaskDetailSheet } from "./chat-task-detail-sheet";
import { ChatTranscript } from "./chat-transcript";
import type { ChatRoomPanelViewProps } from "./types/chat-room.types";

export function ChatRoomPanelView({
	activeSessionId,
	activeTaskId,
	draft,
	errorMessage,
	isBusy,
	isCreatingSession,
	isMessagesLoading,
	isSending,
	isTaskDetailSheetOpen,
	isThinking,
	missionProgress,
	messages,
	messagesError,
	pendingAnswers,
	pendingQuestionIndex,
	projects,
	selectedSession,
	sidebarControlId,
	sidebarToggleRef,
	sessions,
	streamLines,
	workingStartedAt,
	onAnswerChange,
	onArchiveSession,
	onCloseSidebar,
	onCloseTaskDetails,
	onDraftChange,
	onNewSession,
	onOpenTaskDetails,
	onPinSession,
	onSearch,
	onSelectCommand,
	onSelectOption,
	onSelectSession,
	onSubmit,
	onSubmitAnswers,
}: ChatRoomPanelViewProps): ReactElement {
	const pendingQuestions = selectedSession?.pendingQuestions ?? [];
	const hasPendingQuestions = pendingQuestions.length > 0;

	return (
		<section className="relative grid h-[100dvh] min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-background text-zinc-100 md:grid-cols-[18rem_minmax(0,1fr)]">
			<input
				aria-hidden="true"
				className="peer sr-only"
				id={sidebarControlId}
				ref={sidebarToggleRef}
				tabIndex={-1}
				type="checkbox"
			/>
			<label
				aria-label="Close chat sidebar"
				className="fixed inset-0 z-30 hidden bg-black/60 peer-checked:block md:hidden"
				htmlFor={sidebarControlId}
			/>
			<ChatRoomSidebar
				activeSessionId={activeSessionId}
				isCreating={isCreatingSession}
				projects={projects}
				sidebarControlId={sidebarControlId}
				sessions={sessions}
				onArchiveSession={onArchiveSession}
				onCloseSidebar={onCloseSidebar}
				onNewSession={onNewSession}
				onPinSession={onPinSession}
				onSearch={onSearch}
				onSelectSession={onSelectSession}
			/>
			<div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
				<ChatRoomHeader
					activeTaskId={activeTaskId}
					projectId={selectedSession?.projectId ?? "default"}
					sidebarControlId={sidebarControlId}
					title={selectedSession?.title ?? "Untitled"}
					onOpenTaskDetails={onOpenTaskDetails}
				/>
				<ChatTranscript
					error={messagesError}
					isLoading={isMessagesLoading}
					isThinking={isThinking}
					missionProgress={missionProgress}
					messages={messages}
					session={selectedSession}
					streamLines={streamLines}
					workingStartedAt={workingStartedAt}
					onDraftCommand={onSelectCommand}
				/>
				{errorMessage ? (
					<p className="m-0 border-t border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-100">
						{errorMessage}
					</p>
				) : null}
				{hasPendingQuestions ? (
					<ChatClarificationComposer
						answers={pendingAnswers}
						disabled={isBusy || isSending}
						pendingQuestionIndex={pendingQuestionIndex}
						questions={pendingQuestions}
						onAnswerChange={onAnswerChange}
						onSelectOption={onSelectOption}
						onSubmit={onSubmitAnswers}
					/>
				) : (
					<ChatComposer
						disabled={isBusy}
						draft={draft}
						isSending={isSending}
						onDraftChange={onDraftChange}
						onSelectCommand={onSelectCommand}
						onSubmit={onSubmit}
					/>
				)}
			</div>
			<ChatTaskDetailSheet
				isOpen={isTaskDetailSheetOpen}
				taskId={activeTaskId}
				onClose={onCloseTaskDetails}
			/>
		</section>
	);
}
