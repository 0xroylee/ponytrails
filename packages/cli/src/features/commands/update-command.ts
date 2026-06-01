import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CommandResult } from "../../utils/shell";
import { assertCommandOk, runCommand } from "../../utils/shell";
import type {
	UpdateCommand,
	UpdateCommandDeps,
} from "./types/update-command.types";

const DEVOS_INSTALLER_URL = "https://devos.ing/cli";

export async function handleUpdateCommand(
	command: UpdateCommand,
	deps: UpdateCommandDeps = {},
): Promise<void> {
	const tempDir = await mkdtemp(path.join(tmpdir(), "devos-update-"));
	const scriptPath = path.join(tempDir, "install.sh");
	try {
		await runChecked(
			"curl",
			["-fsSL", DEVOS_INSTALLER_URL, "-o", scriptPath],
			command.cwd,
			deps,
		);
		await runChecked("sh", [scriptPath], command.cwd, deps);
	} finally {
		await rm(tempDir, { force: true, recursive: true });
	}
}

async function runChecked(
	command: string,
	args: string[],
	cwd: string,
	deps: UpdateCommandDeps,
): Promise<void> {
	const runner = deps.runCommand ?? runCommand;
	const assertOk = deps.assertCommandOk ?? assertCommandOk;
	const result: CommandResult = await runner(command, args, {
		cwd,
		streamStderr: true,
		streamStdout: true,
	});
	assertOk(command, args, result);
}
