import { describe, expect, it } from "bun:test";

import { createActivityCopyText } from "../src/components/issues-board/issue-activity-copy-utils";
import type { TaskActivityRecord } from "../src/lib/api";

describe("issue activity copy utilities", () => {
	it("builds compact activity text from body and steps", () => {
		expect(
			createActivityCopyText(
				activity({
					body: "Implemented the change",
					steps: [
						{
							id: "step-1",
							stepNumber: 1,
							action: "run tests",
							status: "success",
							detail: "bun test passed",
							recordedAt: "2026-05-13T00:02:30.000Z",
						},
					],
				}),
			),
		).toBe(
			[
				"devos recorded execution output",
				"Status: success",
				"",
				"Implemented the change",
				"",
				"Steps:",
				"1. run tests [success]",
				"   bun test passed",
			].join("\n"),
		);
	});
});

function activity(
	overrides: Partial<TaskActivityRecord> = {},
): TaskActivityRecord {
	return {
		id: "activity-1",
		kind: "execution",
		actorId: "devos",
		actorType: "agent",
		title: "recorded execution output",
		body: "",
		status: "success",
		createdAt: "2026-05-13T00:02:00.000Z",
		...overrides,
	};
}
