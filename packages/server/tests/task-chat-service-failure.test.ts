import { describe, expect, it } from "bun:test";
import { runTaskRequirementIntake } from "../src/tasks/task-chat-service";
import type { CliExecutor } from "../src/types/app.types";

describe("task chat service CLI failures", () => {
	it("surfaces stderr from failed requirement intake commands", async () => {
		const cliExecutor: CliExecutor = {
			execute: async (request) => ({
				status: "failed",
				request,
				commandResult: {
					code: 1,
					stdout: "",
					stderr: "codex failed with exit code 1\n",
				},
			}),
			getHistory: () => [],
		};

		await expect(
			runTaskRequirementIntake(cliExecutor, {
				request: "Build the dashboard",
				projectId: "default",
				answers: [],
			}),
		).rejects.toThrow("codex failed with exit code 1");
	});
});
