import { describe, expect, it } from "bun:test";

import {
	activeChatSessionIdFromPathname,
	isChatSurfacePathname,
} from "../src/components/web-shell/operator-chat-sidebar-route";

describe("operator chat sidebar route helpers", () => {
	it("detects chat surfaces explicitly", () => {
		expect(isChatSurfacePathname("/chat")).toBe(true);
		expect(isChatSurfacePathname("/chat/thread")).toBe(true);
		expect(isChatSurfacePathname("/session/session-1")).toBe(true);
		expect(isChatSurfacePathname("/issues")).toBe(false);
	});

	it("returns no active session for chat and non-chat routes", () => {
		expect(activeChatSessionIdFromPathname("/chat")).toBe("");
		expect(activeChatSessionIdFromPathname("/issues")).toBe("");
		expect(activeChatSessionIdFromPathname("/settings/models")).toBe("");
	});

	it("reads the session id from session routes", () => {
		expect(activeChatSessionIdFromPathname("/session/session-1")).toBe(
			"session-1",
		);
		expect(activeChatSessionIdFromPathname("/session/session-1/details")).toBe(
			"session-1",
		);
	});

	it("decodes encoded session ids without throwing on malformed paths", () => {
		expect(activeChatSessionIdFromPathname("/session/session%2Fone")).toBe(
			"session/one",
		);
		expect(activeChatSessionIdFromPathname("/session/%E0%A4%A")).toBe(
			"%E0%A4%A",
		);
	});
});
