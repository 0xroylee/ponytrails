import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { renderDevosBanner, runOnboardWizard } from "../src/features/onboard";
import type { PromptAdapter } from "../src/features/prompts";
import type { CommandResult } from "../src/utils/shell";

describe("onboard version output", () => {
	it("prints the CLI version after the devos logo", async () => {
		const tempDir = await mkdtemp(
			path.join(process.cwd(), ".tmp-onboard-version-"),
		);
		try {
			const output = await captureStdout(() =>
				runOnboardWizard(tempDir, {
					runCommand: async () => okCommand(),
					prompts: promptAdapter,
					writeOnboardFiles: async () => {},
					configurePluginCredentials: async () => {},
					collectOnboardChecks: async () => [],
				}),
			);
			const cliPackage = JSON.parse(
				await readFile(
					path.resolve(import.meta.dir, "../package.json"),
					"utf8",
				),
			) as { version: string };
			const versionIndex = output.indexOf(`devos v${cliPackage.version}`);
			const bannerIndex = output.indexOf(renderDevosBanner());
			const doctorIndex = output.indexOf("Running doctor checks...");

			expect(versionIndex).toBeGreaterThan(-1);
			expect(bannerIndex).toBeLessThan(versionIndex);
			expect(versionIndex).toBeLessThan(doctorIndex);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});

const promptAdapter: PromptAdapter = {
	text: async (options) => options.defaultValue ?? "",
	password: async () => "",
	confirm: async (options) => options.initialValue ?? true,
	select: async (options) => options.initialValue ?? options.options[0].value,
};

function okCommand(stdout = "ok"): CommandResult {
	return { code: 0, stdout, stderr: "" };
}

async function captureStdout(action: () => Promise<void>): Promise<string> {
	const chunks: string[] = [];
	const originalWrite = process.stdout.write;
	process.stdout.write = ((chunk: string | Uint8Array) => {
		chunks.push(chunk.toString());
		return true;
	}) as typeof process.stdout.write;
	try {
		await action();
	} finally {
		process.stdout.write = originalWrite;
	}
	return chunks.join("");
}
