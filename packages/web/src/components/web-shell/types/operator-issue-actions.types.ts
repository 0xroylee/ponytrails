export interface CommandDraftRequest {
	id: number;
	draft: string;
}

export interface OperatorIssueActionsContextValue {
	commandDraftRequest: CommandDraftRequest | null;
	createIssueRequest: number;
	requestOpenChatSidebar: () => void;
	requestNewIssue: () => void;
	requestOpenIssue: (taskId: string) => void;
	requestChatCommandDraft: (draft: string) => void;
	requestSearch: () => void;
}
