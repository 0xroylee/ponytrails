import type { Command } from "commander";
import type { CliRuntime } from "../types/args.types";

export function registerUpdateCommand(
	program: Command,
	runtime: CliRuntime,
): void {
	program
		.command("update")
		.description("update the globally installed devos CLI")
		.action(async () => {
			await runtime.handleUpdateCommand({ cwd: runtime.cwd });
		});
}
