import { describe, expect, it } from "bun:test";

import {
	DEFAULT_CHAT_SESSION_SUBCHANNEL,
	buildChatSessionHref,
	normalizeChatSessionSubchannel,
	readRouteParam,
} from "../src/components/chat-room/chat-session-subchannels";

describe("chat session subchannels", () => {
	it("defaults unknown route values to chat", () => {
		expect(DEFAULT_CHAT_SESSION_SUBCHANNEL).toBe("chat");
		expect(normalizeChatSessionSubchannel(undefined)).toBe("chat");
		expect(normalizeChatSessionSubchannel("")).toBe("chat");
		expect(normalizeChatSessionSubchannel("other")).toBe("chat");
		expect(normalizeChatSessionSubchannel(["task-info"])).toBe("task-info");
	});

	it("accepts only supported subchannels", () => {
		expect(normalizeChatSessionSubchannel("chat")).toBe("chat");
		expect(normalizeChatSessionSubchannel("task-info")).toBe("task-info");
		expect(normalizeChatSessionSubchannel("Task Info")).toBe("chat");
	});

	it("builds durable encoded session subchannel URLs", () => {
		expect(buildChatSessionHref("session-1")).toBe("/session/session-1/chat");
		expect(buildChatSessionHref("session/one", "task-info")).toBe(
			"/session/session%2Fone/task-info",
		);
	});

	it("reads the first app router param segment", () => {
		expect(readRouteParam("session-1")).toBe("session-1");
		expect(readRouteParam(["session-1", "ignored"])).toBe("session-1");
		expect(readRouteParam(undefined)).toBe("");
	});
});
