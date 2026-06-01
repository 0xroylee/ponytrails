import { describe, expect, it, mock } from "bun:test";
import {
	type CommandResult,
	type ReleaseCommandRunner,
	parseReleaseCliArgs,
	releaseCliPackage,
} from "../scripts/release-cli";

function ok(stdout = ""): CommandResult {
	return { code: 0, stdout, stderr: "" };
}

describe("releaseCliPackage", () => {
	it("runs verification and publish dry-run without publishing by default", async () => {
		const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
		const runner = mock(
			async (
				command: string,
				args: string[],
				options: { cwd: string },
			): Promise<CommandResult> => {
				calls.push({ command, args, cwd: options.cwd });
				return ok("");
			},
		) as ReleaseCommandRunner;

		await releaseCliPackage("/repo", {}, runner);

		expect(calls).toEqual([
			{ command: "git", args: ["status", "--porcelain"], cwd: "/repo" },
			{
				command: "bun",
				args: ["run", "--filter", "devos", "check"],
				cwd: "/repo",
			},
			{
				command: "bun",
				args: ["run", "--filter", "devos", "typecheck"],
				cwd: "/repo",
			},
			{
				command: "bun",
				args: ["run", "--filter", "devos", "test"],
				cwd: "/repo",
			},
			{
				command: "bun",
				args: ["run", "--filter", "devos", "build"],
				cwd: "/repo",
			},
			{
				command: "bun",
				args: ["pm", "pack", "--dry-run", "--ignore-scripts"],
				cwd: "/repo/packages/cli",
			},
			{
				command: "bun",
				args: ["publish", "--dry-run", "--access", "public"],
				cwd: "/repo/packages/cli",
			},
		]);
	});

	it("publishes explicitly after verification", async () => {
		const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
		const runner = mock(
			async (
				command: string,
				args: string[],
				options: { cwd: string },
			): Promise<CommandResult> => {
				calls.push({ command, args, cwd: options.cwd });
				return ok("");
			},
		) as ReleaseCommandRunner;

		await releaseCliPackage(
			"/repo",
			{ publish: true, tag: "next", otp: "123456" },
			runner,
		);

		expect(calls.at(-1)).toEqual({
			command: "bun",
			args: [
				"publish",
				"--access",
				"public",
				"--tag",
				"next",
				"--otp",
				"123456",
			],
			cwd: "/repo/packages/cli",
		});
	});

	it("fails when the worktree is dirty", async () => {
		const runner = mock(async (command: string): Promise<CommandResult> => {
			if (command === "git") {
				return ok(" M packages/cli/package.json\n");
			}
			return ok("");
		}) as ReleaseCommandRunner;

		await expect(releaseCliPackage("/repo", {}, runner)).rejects.toThrow(
			"Working tree is not clean",
		);
	});
});

describe("parseReleaseCliArgs", () => {
	it("parses publish options", () => {
		expect(
			parseReleaseCliArgs(["--publish", "--tag", "next", "--otp", "123456"]),
		).toEqual({
			publish: true,
			tag: "next",
			otp: "123456",
		});
	});

	it("rejects unknown options", () => {
		expect(() => parseReleaseCliArgs(["--surprise"])).toThrow(
			"Unknown release option: --surprise",
		);
	});
});
