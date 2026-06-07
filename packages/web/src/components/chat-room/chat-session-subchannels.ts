export const CHAT_SESSION_SUBCHANNELS = ["chat", "task-info"] as const;

export type ChatSessionSubchannel = (typeof CHAT_SESSION_SUBCHANNELS)[number];

export const DEFAULT_CHAT_SESSION_SUBCHANNEL: ChatSessionSubchannel = "chat";

export const CHAT_SESSION_SUBCHANNEL_LABELS: Record<
	ChatSessionSubchannel,
	string
> = {
	chat: "Chat",
	"task-info": "Task Info",
};

const supportedSubchannels = new Set<string>(CHAT_SESSION_SUBCHANNELS);

export function normalizeChatSessionSubchannel(
	value: string | string[] | undefined,
): ChatSessionSubchannel {
	const routeValue = readRouteParam(value);
	return supportedSubchannels.has(routeValue)
		? (routeValue as ChatSessionSubchannel)
		: DEFAULT_CHAT_SESSION_SUBCHANNEL;
}

export function buildChatSessionHref(
	sessionId: string,
	subchannel: ChatSessionSubchannel = DEFAULT_CHAT_SESSION_SUBCHANNEL,
): string {
	return `/session/${encodeURIComponent(sessionId)}/${subchannel}`;
}

export function readRouteParam(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}
