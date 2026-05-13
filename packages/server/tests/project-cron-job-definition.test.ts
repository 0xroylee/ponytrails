import { describe, expect, it } from "bun:test";
import {
	parseProjectCronJobSkills,
	serializeProjectCronJobSkills,
	validateProjectCronJobDefinition,
} from "../src/cron";

describe("project cron job definition validation", () => {
	it("accepts valid cron job definitions", () => {
		const result = validateProjectCronJobDefinition({
			projectId: "project-1",
			cronExpression: "0 * * * *",
			targetType: "script",
			target: "review:hourly",
			skills: ["adhd-plan", "adhd-implement"],
			enabled: true,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.projectId).toBe("project-1");
		expect(result.value.targetType).toBe("script");
	});

	it("rejects malformed cron job definitions", () => {
		const result = validateProjectCronJobDefinition({
			projectId: "",
			cronExpression: "",
			targetType: "task",
			target: "",
			skills: "adhd-plan",
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.errors).toEqual([
			{
				field: "projectId",
				message: "projectId must be a non-empty string",
			},
			{
				field: "cronExpression",
				message: "cronExpression must be a non-empty string",
			},
			{
				field: "targetType",
				message: "targetType must be one of: script, hook",
			},
			{
				field: "target",
				message: "target must be a non-empty string",
			},
			{
				field: "skills",
				message: "skills must be an array of strings",
			},
		]);
	});

	it("serializes and parses skills payloads", () => {
		const serialized = serializeProjectCronJobSkills([
			"adhd-plan",
			"adhd-implement",
		]);
		expect(serialized).toBe('["adhd-plan","adhd-implement"]');

		const parsed = parseProjectCronJobSkills(serialized);
		expect(parsed).toEqual(["adhd-plan", "adhd-implement"]);
	});

	it("rejects invalid skills JSON payloads", () => {
		expect(parseProjectCronJobSkills("not-json")).toEqual({
			error: "skills must be valid JSON",
		});
		expect(parseProjectCronJobSkills('{"skills":["a"]}')).toEqual({
			error: "skills must be a JSON string array",
		});
		expect(parseProjectCronJobSkills('["a",1]')).toEqual({
			error: "skills must be a JSON string array",
		});
	});
});
