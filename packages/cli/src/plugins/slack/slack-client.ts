import { SlackApiError } from "./slack-error";
import {
	type SlackAuthTestPayload,
	type SlackHistoryPayload,
	type SlackPostMessagePayload,
	toAuthIdentity,
	toReceivedMessageBatch,
	toSentMessage,
} from "./slack-mappers";
import type {
	SlackApiResponse,
	SlackClient,
	SlackClientConfig,
	SlackConnectivityCheckInput,
	SlackConnectivityCheckResult,
	SlackReceiveMessagesInput,
	SlackReceivedMessageBatch,
	SlackSendMessageInput,
	SlackSentMessage,
} from "./slack.types";

const DEFAULT_API_BASE_URL = "https://slack.com/api";

export function createSlackClient(config: SlackClientConfig): SlackClient {
	const botToken = normalizeBotToken(config.botToken);
	const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
	const fetchImpl = config.fetchImpl ?? fetch;

	return {
		testConnection: () =>
			callSlack<SlackAuthTestPayload>({
				apiBaseUrl,
				botToken,
				fetchImpl,
				method: "auth.test",
			}).then(toAuthIdentity),
		sendMessage: (input) =>
			sendSlackMessage({ apiBaseUrl, botToken, fetchImpl }, input),
		receiveMessages: (input) =>
			receiveSlackMessages({ apiBaseUrl, botToken, fetchImpl }, input),
		runConnectivityCheck: (input) =>
			runSlackConnectivityCheck({ apiBaseUrl, botToken, fetchImpl }, input),
	};
}

async function sendSlackMessage(
	client: SlackRuntimeClient,
	input: SlackSendMessageInput,
): Promise<SlackSentMessage> {
	const result = await callSlack<SlackPostMessagePayload>({
		...client,
		method: "chat.postMessage",
		body: {
			channel: input.channelId,
			text: input.text,
			...(input.threadTs === undefined ? {} : { thread_ts: input.threadTs }),
		},
	});
	return toSentMessage(result);
}

async function receiveSlackMessages(
	client: SlackRuntimeClient,
	input: SlackReceiveMessagesInput,
): Promise<SlackReceivedMessageBatch> {
	const result = await callSlack<SlackHistoryPayload>({
		...client,
		method: "conversations.history",
		body: {
			channel: input.channelId,
			...(input.oldest === undefined ? {} : { oldest: input.oldest }),
			...(input.latest === undefined ? {} : { latest: input.latest }),
			...(input.limit === undefined ? {} : { limit: input.limit }),
			...(input.cursor === undefined ? {} : { cursor: input.cursor }),
		},
	});
	return toReceivedMessageBatch(result, input.channelId);
}

async function runSlackConnectivityCheck(
	client: SlackRuntimeClient,
	input: SlackConnectivityCheckInput,
): Promise<SlackConnectivityCheckResult> {
	const sent = await sendSlackMessage(client, {
		channelId: input.channelId,
		text: input.testText,
		threadTs: input.threadTs,
	});
	const received = await receiveSlackMessages(client, {
		channelId: input.channelId,
		limit: input.receiveLimit,
	});
	return {
		sent,
		received: received.messages,
		sendSucceeded: true,
		receiveSucceeded: received.messages.length > 0,
		...(received.nextCursor === undefined
			? {}
			: { nextCursor: received.nextCursor }),
	};
}

interface SlackRuntimeClient {
	apiBaseUrl: string;
	botToken: string;
	fetchImpl: typeof fetch;
}

async function callSlack<T>(
	input: SlackRuntimeClient & {
		method: string;
		body?: Record<string, unknown>;
	},
): Promise<T> {
	const response = await input.fetchImpl(
		`${input.apiBaseUrl}/${input.method}`,
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${input.botToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(input.body ?? {}),
		},
	);
	const payload = (await response.json().catch(() => undefined)) as
		| (SlackApiResponse & T)
		| undefined;
	if (!response.ok || !payload?.ok) {
		throw new SlackApiError({
			method: input.method,
			status: response.status,
			error: payload?.error ?? response.statusText,
		});
	}
	return payload as T;
}

function normalizeBotToken(botToken: string): string {
	const normalized = botToken.trim();
	if (!normalized) {
		throw new Error("Slack bot token is required");
	}
	return normalized;
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string {
	return (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}
