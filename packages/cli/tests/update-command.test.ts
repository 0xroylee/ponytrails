import { describe, expect, it, mock } from "bun:test";
import { handleUpdateCommand } from "../src/features/commands/update-command";
import type { CommandResult } from "../src/utils/shell";

describe("handleUpdateCommand", () => {
	it("downloads and runs the hosted installer through structured commands", async () => {
		const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
		const runCommand = mock(
			async (
				command: string,
				args: string[],
				options: { cwd: string },
			): Promise<CommandResult> => {
				calls.push({ command, args, cwd: options.cwd });
				return { code: 0, stdout: "", stderr: "" };
			},
		);

		await handleUpdateCommand(
			{ cwd: "/tmp/devos-workspace" },
			{ runCommand, assertCommandOk: assertOk },
		);

		const scriptPath = calls[0]?.args[3] ?? "";
		expect(scriptPath).toContain("devos-update-");
		expect(calls).toEqual([
			{
				command: "curl",
				args: ["-fsSL", "https://devos.ing/cli", "-o", scriptPath],
				cwd: "/tmp/devos-workspace",
			},
			{
				command: "sh",
				args: [scriptPath],
				cwd: "/tmp/devos-workspace",
			},
		]);
	});
});

function assertOk(
	command: string,
	args: string[],
	result: CommandResult,
): void {
	if (result.code !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
}
