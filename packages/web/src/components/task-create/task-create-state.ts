import type { TaskCreateChatState } from "./task-create-chat-dialog.types";

export function createInitialState(
	defaultBoardProjectId: string,
): TaskCreateChatState {
	return {
		request: "",
		projectId: defaultBoardProjectId,
		answers: [],
		questions: [],
		step: "request",
		errorMessage: null,
		result: null,
		logs: [],
	};
}
