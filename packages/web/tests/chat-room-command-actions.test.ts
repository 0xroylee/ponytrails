import { describe, expect, it } from "bun:test";

import { eventText } from "../src/components/chat-room/chat-room-command-actions";
import type { CommandRunResult } from "../src/components/chat-room/types/chat-room.types";

describe("chat room command actions", () => {
	it("streams workflow progress detail text", () => {
		expect(
			eventText(
				progressEvent({
					kind: "action",
					action: "plan",
					status: "started",
					detail: "Planning issue",
				}),
			),
		).toBe("Planning issue");
	});

	it("streams workflow progress summary text", () => {
		expect(
			eventText(
				progressEvent({
					kind: "summary",
					summary: "Plan ready",
				}),
			),
		).toBe("Plan ready");
	});
});

function progressEvent(
	event: CommandRunResult["events"][number] extends {
		type: "progress";
		event: infer Event;
	}
		? Partial<Event>
		: never,
): CommandRunResult["events"][number] {
	return {
		type: "progress",
		event: {
			schema: "devos.workflow.stream.v1",
			emittedAt: "2026-06-09T00:00:00.000Z",
			...event,
		},
	} as CommandRunResult["events"][number];
}
