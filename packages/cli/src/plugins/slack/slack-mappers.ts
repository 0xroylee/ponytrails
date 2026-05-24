import type {
	SlackAuthIdentity,
	SlackReceivedMessage,
	SlackReceivedMessageBatch,
	SlackSentMessage,
} from "./slack.types";

export interface SlackAuthTestPayload {
	url?: string;
	team?: string;
	user?: string;
	team_id?: string;
	user_id?: string;
	bot_id?: string;
	enterprise_id?: string;
}

export interface SlackMessagePayload {
	ts: string;
	text?: string;
	user?: string;
	bot_id?: string;
	thread_ts?: string;
	type?: string;
	subtype?: string;
}

export interface SlackPostMessagePayload {
	channel: string;
	ts: string;
	message?: SlackMessagePayload;
}

export interface SlackHistoryPayload {
	messages?: SlackMessagePayload[];
	response_metadata?: {
		next_cursor?: string;
	};
}

export function toAuthIdentity(
	payload: SlackAuthTestPayload,
): SlackAuthIdentity {
	return {
		url: payload.url,
		team: payload.team,
		user: payload.user,
		teamId: payload.team_id,
		userId: payload.user_id,
		botId: payload.bot_id,
		enterpriseId: payload.enterprise_id,
	};
}

export function toSentMessage(
	payload: SlackPostMessagePayload,
): SlackSentMessage {
	return {
		channelId: payload.channel,
		ts: payload.ts,
		text: payload.message?.text,
		threadTs: payload.message?.thread_ts,
	};
}

export function toReceivedMessage(
	message: SlackMessagePayload,
	channelId: string,
): SlackReceivedMessage {
	return {
		ts: message.ts,
		channelId,
		text: message.text,
		user: message.user,
		botId: message.bot_id,
		threadTs: message.thread_ts,
		type: message.type,
		subtype: message.subtype,
	};
}

export function toReceivedMessageBatch(
	payload: SlackHistoryPayload,
	channelId: string,
): SlackReceivedMessageBatch {
	const nextCursor = payload.response_metadata?.next_cursor;
	return {
		messages: (payload.messages ?? []).map((message) =>
			toReceivedMessage(message, channelId),
		),
		...(nextCursor ? { nextCursor } : {}),
	};
}
