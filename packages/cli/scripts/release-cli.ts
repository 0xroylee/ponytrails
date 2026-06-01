import path from "node:path";

export interface ReleaseCliOptions {
	publish?: boolean;
	tag?: string;
	otp?: string;
}

export type ReleaseCommandRunner = (
	command: string,
	args: string[],
	options: {
		cwd: string;
		env?: Record<string, string | undefined>;
		streamStdout?: boolean;
		streamStderr?: boolean;
		stdinMode?: "ignore" | "pipe";
	},
) => Promise<CommandResult>;

export interface CommandResult {
	code: number;
	stdout: string;
	stderr: string;
}

export async function releaseCliPackage(
	workspaceRoot: string,
	options: ReleaseCliOptions = {},
	commandRunner?: ReleaseCommandRunner,
): Promise<void> {
	const runner = commandRunner ?? (await loadReleaseCommandRunner());
	const packageRoot = path.join(workspaceRoot, "packages/cli");
	const commands: Array<{ command: string; args: string[]; cwd: string }> = [
		{ command: "git", args: ["status", "--porcelain"], cwd: workspaceRoot },
		{
			command: "bun",
			args: ["run", "--filter", "devos", "check"],
			cwd: workspaceRoot,
		},
		{
			command: "bun",
			args: ["run", "--filter", "devos", "typecheck"],
			cwd: workspaceRoot,
		},
		{
			command: "bun",
			args: ["run", "--filter", "devos", "test"],
			cwd: workspaceRoot,
		},
		{
			command: "bun",
			args: ["run", "--filter", "devos", "build"],
			cwd: workspaceRoot,
		},
		{
			command: "bun",
			args: ["pm", "pack", "--dry-run", "--ignore-scripts"],
			cwd: packageRoot,
		},
		{
			command: "bun",
			args: ["publish", "--dry-run", "--access", "public"],
			cwd: packageRoot,
		},
	];
	if (options.publish) {
		commands.push({
			command: "bun",
			args: buildPublishArgs(options),
			cwd: packageRoot,
		});
	}

	for (const step of commands) {
		const result = await runner(step.command, step.args, {
			cwd: step.cwd,
			streamStdout: true,
			streamStderr: true,
		});
		if (step.command === "git") {
			assertCleanWorktree(result);
			continue;
		}
		assertCommandSucceeded(step.command, step.args, result);
	}
}

async function loadReleaseCommandRunner(): Promise<ReleaseCommandRunner> {
	const { runCommand } = await import("../src/utils/shell");
	return runCommand;
}

function buildPublishArgs(options: ReleaseCliOptions): string[] {
	const args = ["publish", "--access", "public"];
	if (options.tag) {
		args.push("--tag", options.tag);
	}
	if (options.otp) {
		args.push("--otp", options.otp);
	}
	return args;
}

function assertCleanWorktree(result: CommandResult): void {
	if (result.code !== 0) {
		throw new Error(
			`Failed to verify git status:\n${result.stderr || result.stdout}`,
		);
	}
	if (result.stdout.trim().length > 0) {
		throw new Error(
			"Working tree is not clean. Commit or stash changes before releasing.",
		);
	}
}

function assertCommandSucceeded(
	command: string,
	args: string[],
	result: CommandResult,
): void {
	if (result.code !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed with ${result.code}\n${result.stderr || result.stdout}`,
		);
	}
}

export function parseReleaseCliArgs(args: string[]): ReleaseCliOptions {
	const options: ReleaseCliOptions = {};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--publish") {
			options.publish = true;
			continue;
		}
		if (arg === "--tag") {
			options.tag = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}
		if (arg === "--otp") {
			options.otp = readOptionValue(args, index, arg);
			index += 1;
			continue;
		}
		throw new Error(`Unknown release option: ${arg}`);
	}
	return options;
}

function readOptionValue(
	args: string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];
	if (!value) {
		throw new Error(`Missing value for ${option}`);
	}
	return value;
}

if (import.meta.main) {
	await releaseCliPackage(
		path.resolve(import.meta.dir, "../../.."),
		parseReleaseCliArgs(process.argv.slice(2)),
	);
}
