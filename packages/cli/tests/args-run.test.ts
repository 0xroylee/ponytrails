import { describe, expect, it } from "bun:test";
import { captureWithRuntime, expectCommanderError } from "./args-test-helpers";

describe("createCliProgram run", () => {
	it("runs issue and project scopes", async () => {
		expect((await captureWithRuntime(["bun", "devos", "run"])).calls).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					poll: true,
					pollForever: true,
				},
			},
		]);
		expect(
			(await captureWithRuntime(["bun", "devos", "run", "--issue", "ABC-1"]))
				.calls,
		).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					issueArg: "ABC-1",
					poll: true,
					pollForever: true,
				},
			},
		]);
		expect(
			(await captureWithRuntime(["bun", "devos", "run", "--project", "api"]))
				.calls,
		).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					projectId: "api",
					poll: true,
					pollForever: true,
				},
			},
		]);
	});

	it("runs polling flags and numeric options", async () => {
		const result = await captureWithRuntime([
			"bun",
			"devos",
			"run",
			"--poll",
			"--poll-interval-ms",
			"15000",
			"--max-poll-cycles",
			"20",
			"--concurrency",
			"2",
		]);

		expect(result.calls).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					poll: true,
					concurrency: 2,
					pollIntervalMs: 15000,
					maxPollCycles: 20,
				},
			},
		]);
	});

	it("runs boolean run mode flags", async () => {
		expect(
			(
				await captureWithRuntime([
					"bun",
					"devos",
					"run",
					"--poll",
					"--no-exit-when-idle",
				])
			).calls,
		).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					poll: true,
					pollForever: true,
					exitWhenIdle: false,
				},
			},
		]);
		expect(
			(
				await captureWithRuntime([
					"bun",
					"devos",
					"run",
					"--isolated-worktrees",
				])
			).calls,
		).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					poll: true,
					pollForever: true,
					isolatedWorktrees: true,
				},
			},
		]);
	});

	it("runs poll-forever as polling", async () => {
		expect(
			(await captureWithRuntime(["bun", "devos", "run", "--poll-forever"]))
				.calls,
		).toEqual([
			{ name: "loadConfig" },
			{
				name: "run",
				payload: {
					poll: true,
					pollForever: true,
				},
			},
		]);
	});

	it("rejects invalid positive integer options", async () => {
		for (const argv of [
			["bun", "devos", "run", "--poll-interval-ms", "0"],
			["bun", "devos", "run", "--max-poll-cycles", "-1"],
			["bun", "devos", "run", "--concurrency", "1.5"],
		]) {
			const result = await expectCommanderError(argv);

			expect(result.error.message).toContain("must be a positive integer");
			expect(result.stderr).toContain("Usage: devos run [options]");
		}
	});

	it("rejects incompatible run scope and polling flags", async () => {
		const projectScope = await expectCommanderError([
			"bun",
			"devos",
			"run",
			"--project",
			"api",
			"--all-projects",
		]);
		const pollForever = await expectCommanderError([
			"bun",
			"devos",
			"run",
			"--poll-forever",
			"--max-poll-cycles",
			"2",
		]);

		expect(projectScope.error.message).toBe(
			"run command cannot use --project with --all-projects",
		);
		expect(pollForever.error.message).toContain(
			"run command cannot use --poll-forever with --max-poll-cycles",
		);
	});
});
