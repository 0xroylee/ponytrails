import type { ChatSessionRow } from "devos-db";
import type { BoardTaskApiRecord } from "../tasks";
import {
	DEFAULT_CHAT_ISSUE_CONTENT,
	DEFAULT_CHAT_ISSUE_TITLE,
	UNTITLED_SESSION,
} from "./chat-defaults";
import { mapMessage, mapSession, titleFromMessage } from "./chat-mappers";
import { appendChatMessage, updateChatSessionRow } from "./chat-writes";
import type {
	ChatRepository,
	ChatSendInput,
	ChatSendResult,
	ChatSendStreamCallbacks,
	ChatServiceDeps,
	ChatSessionIssueUpdateInput,
	ChatSessionUpdateInput,
} from "./types/chat.types";

export async function sendChatMessage(
	repository: ChatRepository,
	deps: ChatServiceDeps,
	sessionId: string,
	input: ChatSendInput,
	stream?: ChatSendStreamCallbacks,
): Promise<ChatSendResult | null> {
	const session = await repository.getSession(sessionId);
	if (!session) {
		return null;
	}
	const linked = await ensureIssueForSession(repository, deps, session);
	const userMessage = await appendChatMessage(repository, sessionId, {
		content: input.content,
		kind: input.answers?.length ? "clarification" : "message",
		metadata: input.answers ? { answers: input.answers } : null,
		role: "user",
		taskId: linked.issue.id,
	});
	const userRecord = mapMessage(userMessage);
	stream?.onUserMessage?.(userRecord);
	stream?.onStreamStarted?.({
		runId: stream.runId,
		sessionId,
		userMessageId: userRecord.id,
	});
	try {
		const issue = await updateIssueAfterMessage(deps, linked.issue, input);
		const updatedSession = await updateSessionAfterMessage(
			repository,
			linked.session,
			input,
		);
		const assistantChunks = assistantMessageChunks(issue, input);
		for (const delta of assistantChunks) {
			stream?.onStreamDelta?.({ delta, runId: stream.runId, sessionId });
		}
		const assistantMessage = await appendChatMessage(repository, sessionId, {
			content: assistantChunks.join(""),
			kind: "task",
			metadata: { runId: stream?.runId ?? null },
			role: "assistant",
			taskId: issue.id,
		});
		const assistantRecord = mapMessage(assistantMessage);
		stream?.onStreamCompleted?.({
			message: assistantRecord,
			runId: stream.runId,
			sessionId,
		});
		stream?.onAssistantMessage?.(assistantRecord);
		return {
			issue,
			session: mapSession(updatedSession),
			messages: [userRecord, assistantRecord],
		};
	} catch (error) {
		stream?.onStreamError?.({
			error: error instanceof Error ? error.message : String(error),
			runId: stream.runId,
			sessionId,
		});
		throw error;
	}
}

export async function ensureIssueForSession(
	repository: ChatRepository,
	deps: ChatServiceDeps,
	session: ChatSessionRow,
): Promise<{ issue: BoardTaskApiRecord; session: ChatSessionRow }> {
	const existingIssue = session.taskId
		? await deps.getIssue(session.taskId)
		: null;
	if (existingIssue) {
		const projectId =
			session.projectId ??
			existingIssue.projectId ??
			(await deps.ensureDefaultProject()).id;
		if (session.projectId === projectId) {
			return { issue: existingIssue, session };
		}
		const updated = await updateChatSessionRow(repository, session.id, {
			projectId,
		});
		return { issue: existingIssue, session: updated ?? session };
	}
	const projectId = session.projectId ?? (await deps.ensureDefaultProject()).id;
	const issue = await deps.createIssue({
		content: DEFAULT_CHAT_ISSUE_CONTENT,
		projectId,
		title: DEFAULT_CHAT_ISSUE_TITLE,
	});
	const updated = await updateChatSessionRow(repository, session.id, {
		projectId,
		taskId: issue.id,
	});
	return {
		issue,
		session: updated ?? { ...session, projectId, taskId: issue.id },
	};
}

async function updateSessionAfterMessage(
	repository: ChatRepository,
	session: ChatSessionRow,
	input: ChatSendInput,
): Promise<ChatSessionRow> {
	const update: ChatSessionUpdateInput = {
		pendingRequest: null,
		pendingQuestions: null,
	};
	if (session.title === UNTITLED_SESSION && input.content.trim()) {
		update.title = titleFromMessage(input.content);
	}
	return (
		(await updateChatSessionRow(repository, session.id, update)) ??
		(await repository.getSession(session.id)) ??
		session
	);
}

async function updateIssueAfterMessage(
	deps: ChatServiceDeps,
	issue: BoardTaskApiRecord,
	input: ChatSendInput,
): Promise<BoardTaskApiRecord> {
	const issueUpdate = issueUpdateFromMessage(issue, input.content);
	return issueUpdate ? deps.updateIssue(issue.id, issueUpdate) : issue;
}

function issueUpdateFromMessage(
	issue: BoardTaskApiRecord,
	content: string,
): ChatSessionIssueUpdateInput | null {
	const trimmed = content.trim();
	if (
		!trimmed ||
		issue.title !== DEFAULT_CHAT_ISSUE_TITLE ||
		issue.content !== DEFAULT_CHAT_ISSUE_CONTENT
	) {
		return null;
	}
	return {
		content: trimmed,
		title: titleFromMessage(trimmed),
	};
}

function assistantMessageChunks(
	issue: BoardTaskApiRecord,
	input: ChatSendInput,
): string[] {
	const subject = `${issue.taskKey}: ${issue.title}`;
	return input.answers?.length
		? ["Saved clarification answers for ", subject]
		: ["Updated task ", subject];
}
