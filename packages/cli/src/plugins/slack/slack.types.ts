export interface SlackClientConfig {
	botToken: string;
	apiBaseUrl?: string;
	fetchImpl?: typeof fetch;
}

export interface SlackAuthIdentity {
	url?: string;
	team?: string;
	user?: string;
	teamId?: string;
	userId?: string;
	botId?: string;
	enterpriseId?: string;
}

export interface SlackSendMessageInput {
	channelId: string;
	text: string;
	threadTs?: string;
}

export interface SlackSentMessage {
	channelId: string;
	ts: string;
	text?: string;
	threadTs?: string;
}

export interface SlackReceiveMessagesInput {
	channelId: string;
	oldest?: string;
	latest?: string;
	limit?: number;
	cursor?: string;
}

export interface SlackReceivedMessage {
	ts: string;
	channelId: string;
	text?: string;
	user?: string;
	botId?: string;
	threadTs?: string;
	type?: string;
	subtype?: string;
}

export interface SlackReceivedMessageBatch {
	messages: SlackReceivedMessage[];
	nextCursor?: string;
}

export interface SlackConnectivityCheckInput {
	channelId: string;
	testText: string;
	receiveLimit?: number;
	threadTs?: string;
}

export interface SlackConnectivityCheckResult {
	sent: SlackSentMessage;
	received: SlackReceivedMessage[];
	sendSucceeded: boolean;
	receiveSucceeded: boolean;
	nextCursor?: string;
}

export interface SlackClient {
	testConnection(): Promise<SlackAuthIdentity>;
	sendMessage(input: SlackSendMessageInput): Promise<SlackSentMessage>;
	receiveMessages(
		input: SlackReceiveMessagesInput,
	): Promise<SlackReceivedMessageBatch>;
	runConnectivityCheck(
		input: SlackConnectivityCheckInput,
	): Promise<SlackConnectivityCheckResult>;
}

export interface SlackApiErrorOptions {
	method: string;
	status?: number;
	error?: string;
}

export interface SlackApiResponse {
	ok: boolean;
	error?: string;
	response_metadata?: {
		next_cursor?: string;
	};
}
