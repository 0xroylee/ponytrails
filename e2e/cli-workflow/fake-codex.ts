#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outputFile = readOption("--output-last-message");
if (!outputFile) {
	console.error("fake-codex requires --output-last-message");
	process.exit(1);
}

const prompt = args.at(-1) ?? "";
const output = renderOutput(prompt, args.includes("resume"));
mkdirSync(path.dirname(outputFile), { recursive: true });
writeFileSync(outputFile, output, "utf8");
console.log(
	JSON.stringify({
		session_id: output.startsWith("PLANNING_RESULT")
			? "fake-plan-session"
			: "fake-review-session",
		usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
	}),
);

function readOption(name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

function renderOutput(prompt: string, isResume: boolean): string {
	if (isResume) {
		return "Implemented by fake Codex.";
	}
	if (
		prompt.includes("BUGS_JSON") ||
		prompt.includes("review and testing agent")
	) {
		return "RESULT: PASS\nSUMMARY: clean\nBUGS_JSON: []";
	}
	return [
		"PLANNING_RESULT: READY",
		"SUCCESS_GOAL: Exercise the workflow through the CLI process.",
		"COMPLEXITY: SIMPLE",
		"COMPLEXITY_SCORE: 3",
		"Run the existing dry-run implementation path.",
	].join("\n");
}
