import { readFile } from "node:fs/promises";
import { normalizeGithubInstructionsConfig } from "./github-instructions";
import { instanceConfigPath } from "./home-paths";
import type { GithubInstructionsConfig } from "./types/github-instructions.types";

export async function loadInstanceGithubConfig(
	readText: (
		targetPath: string,
		encoding: BufferEncoding,
	) => Promise<string> = readFile,
): Promise<GithubInstructionsConfig | undefined> {
	let content: string;
	try {
		content = await readText(instanceConfigPath(), "utf8");
	} catch {
		return undefined;
	}

	try {
		const parsed = JSON.parse(content) as unknown;
		if (!isRecord(parsed) || !isRecord(parsed.github)) return undefined;
		return normalizeGithubInstructionsConfig(parsed.github);
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
