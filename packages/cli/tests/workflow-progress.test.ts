import { afterEach, describe, expect, it } from "bun:test";
import {
	WORKFLOW_PROGRESS_SENTINEL,
	emitWorkflowProgress,
	parseWorkflowProgressLine,
} from "../src/features/server";
import { extractPlanSectionItems } from "../src/features/workflow/progress";

const previousProgressEnv = process.env.DEVOS_WORKFLOW_PROGRESS_STREAM;

afterEach(() => {
	if (previousProgressEnv === undefined) {
		Reflect.deleteProperty(process.env, "DEVOS_WORKFLOW_PROGRESS_STREAM");
	} else {
		process.env.DEVOS_WORKFLOW_PROGRESS_STREAM = previousProgressEnv;
	}
});

describe("workflow progress helpers", () => {
	it("emits and parses sentinel-prefixed progress lines", () => {
		const writes: string[] = [];
		process.env.DEVOS_WORKFLOW_PROGRESS_STREAM = "1";

		emitWorkflowProgress(
			{
				kind: "action",
				projectId: "default",
				issueKey: "TASK-1",
				stage: "planning",
				action: "plan",
				status: "succeeded",
			},
			(text) => writes.push(text),
		);

		expect(writes[0]?.startsWith(WORKFLOW_PROGRESS_SENTINEL)).toBe(true);
		const parsed = parseWorkflowProgressLine(writes[0] ?? "");
		expect(parsed).toMatchObject({
			status: "ok",
			event: {
				kind: "action",
				projectId: "default",
				action: "plan",
			},
		});
	});

	it("extracts planner checkpoints and test plan items", () => {
		const plan = [
			"Title",
			"Do the thing",
			"Agent Plan",
			"- planner: clarify scope",
			"- implementer: ship code",
			"Checkpoints (Steps)",
			"1. Add daemon progress frames",
			"2. Persist JSONL logs",
			"Test plan",
			"- bun test packages/cli/tests/workflow-progress.test.ts",
			"Assumptions",
			"- Existing daemon stays websocket-based",
		].join("\n");

		expect(extractPlanSectionItems(plan, "Checkpoints (Steps)")).toEqual([
			"Add daemon progress frames",
			"Persist JSONL logs",
		]);
		expect(extractPlanSectionItems(plan, "Test plan")).toEqual([
			"bun test packages/cli/tests/workflow-progress.test.ts",
		]);
	});

	it("treats Agent Plan as a planner section boundary", () => {
		const plan = [
			"Key Changes",
			"- Update the planning contract",
			"Agent Plan",
			"- planner: produce the agent-scoped plan",
			"- implementer: apply the scoped change",
			"Checkpoints (Steps)",
			"1. Verify prompts include Agent Plan",
		].join("\n");

		expect(extractPlanSectionItems(plan, "Key Changes")).toEqual([
			"Update the planning contract",
		]);
		expect(extractPlanSectionItems(plan, "Agent Plan")).toEqual([
			"planner: produce the agent-scoped plan",
			"implementer: apply the scoped change",
		]);
	});
});
