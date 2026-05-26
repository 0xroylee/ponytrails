import { describe, expect, it } from "bun:test";
import {
	isActiveMissionStatus,
	isMissionVisibleStatus,
} from "../src/components/chat-room/chat-mission-progress-state";
import {
	missionModel,
	tokenUsageRecord,
} from "./chat-mission-progress-fixtures";

describe("chat mission progress", () => {
	it("tracks active statuses and keeps terminal missions visible", () => {
		expect(isActiveMissionStatus("backlog")).toBe(false);
		expect(isActiveMissionStatus("plan")).toBe(false);
		expect(isActiveMissionStatus("done")).toBe(false);
		expect(isActiveMissionStatus("blocked")).toBe(false);
		expect(isActiveMissionStatus("in_progress")).toBe(true);
		expect(isActiveMissionStatus("in_review")).toBe(true);
		expect(isMissionVisibleStatus("done")).toBe(true);
		expect(isMissionVisibleStatus("failed")).toBe(true);
	});

	it("maps task activity into status, notes, logs, steps, and result", () => {
		const mission = missionModel();

		expect(mission.statusLabel).toBe("In Progress");
		expect(mission.notes[0]?.body).toContain("changed status");
		expect(mission.latestLogLines.at(-1)).toEqual(
			expect.objectContaining({ stream: "stderr", text: "Testing output" }),
		);
		expect(mission.latestResult).toEqual({
			label: "succeeded",
			tone: "success",
		});
		expect(mission.phases.map((phase) => phase.id)).toEqual([
			"plan",
			"implement",
			"testing",
			"qa",
		]);
		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"running",
			"pending",
			"pending",
		]);

		expect(mission.phaseLogLines.plan).toEqual([
			expect.objectContaining({ text: "Plan output" }),
		]);
		expect(mission.phaseLogLines.implement).toEqual([
			expect.objectContaining({ text: "Implement output" }),
		]);
		expect(mission.phaseLogLines.testing).toEqual([
			expect.objectContaining({ text: "Testing output" }),
		]);
		expect(mission.phaseCheckpoints.plan.map((item) => item.label)).toEqual([
			"Plan",
			"Split tasks",
		]);
		expect(
			mission.phaseCheckpoints.implement.map((item) => item.label),
		).toEqual(["Implementation", "Prepare pr"]);
		expect(mission.phaseCheckpoints.testing.map((item) => item.label)).toEqual([
			"Review testing",
		]);
		expect(mission.phaseCheckpoints.qa).toEqual([]);
	});

	it("summarizes estimated usage on the mission model", () => {
		const mission = missionModel("succeeded", "done", [tokenUsageRecord()]);

		expect(mission.usageSummary).toEqual({
			estimatedCostMicrousd: 20000,
			inputTokens: 1000,
			outputTokens: 250,
			runs: 1,
			totalTokens: 1250,
		});
	});

	it("derives QA status from the latest result without QA events", () => {
		const mission = missionModel("failed", "failed");

		expect(mission.latestResult).toEqual({
			label: "failed",
			tone: "error",
		});
		expect(mission.phases.find((phase) => phase.id === "qa")?.status).toBe(
			"failed",
		);
	});
});
