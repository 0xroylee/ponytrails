import { describe, expect, it } from "bun:test";

import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import {
	activityStep,
	missionModelWithSteps,
} from "./chat-mission-progress-fixtures";

describe("chat mission progress status normalization", () => {
	it("shows loading only for the canonical current stage", () => {
		const mission = missionModelWithRunningSteps("in_progress");

		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"running",
			"pending",
			"pending",
		]);
		expect(mission.phaseCheckpoints.plan.map((item) => item.status)).toEqual([
			"success",
		]);
		expect(
			mission.phaseCheckpoints.implement.map((item) => item.status),
		).toEqual(["running"]);
		expect(mission.phaseCheckpoints.testing.map((item) => item.status)).toEqual(
			["pending"],
		);
	});

	it("marks upcoming stages pending after advancing to review", () => {
		const mission = missionModelWithRunningSteps("in_review");

		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"success",
			"running",
			"pending",
		]);
		expect(mission.phaseCheckpoints.plan.map((item) => item.status)).toEqual([
			"success",
		]);
		expect(
			mission.phaseCheckpoints.implement.map((item) => item.status),
		).toEqual(["success"]);
		expect(mission.phaseCheckpoints.testing.map((item) => item.status)).toEqual(
			["running"],
		);
	});

	it("removes loading states from terminal successful missions", () => {
		const mission = missionModelWithRunningSteps("done");

		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"success",
			"success",
			"success",
		]);
		expect(
			Object.values(mission.phaseCheckpoints)
				.flat()
				.map((checkpoint) => checkpoint.status),
		).not.toContain("running");
	});
});

function missionModelWithRunningSteps(
	taskStatus: string,
): ChatMissionProgressViewModel {
	return missionModelWithSteps({
		executionStatus: "running",
		taskStatus,
		steps: [
			activityStep(1, "plan", "plan", "running"),
			activityStep(2, "implementation", "in_progress", "running"),
			activityStep(3, "review-testing", "in_review", "running"),
		],
	});
}
