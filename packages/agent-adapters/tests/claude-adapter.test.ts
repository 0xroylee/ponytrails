import { describe, expect, it } from "bun:test";
import {
	ClaudeCodeAdapter,
	extractSessionId,
	extractUsage,
} from "../src/claude";
import { config } from "./fixtures";

describe("claude code adapter", () => {
	it("builds common args from primary claude config", () => {
		const adapter = new ClaudeCodeAdapter({
			...config,
			claude: {
				model: "claude-sonnet-4-20250514",
				maxTurns: 7,
				allowedTools: ["Bash", "Read", "Edit"],
				permissionMode: "plan",
			},
		});

		expect(buildCommonArgs(adapter)).toEqual([
			"--output-format",
			"json",
			"--permission-mode",
			"plan",
			"--model",
			"claude-sonnet-4-20250514",
			"--max-turns",
			"7",
			"--allowedTools",
			"Bash",
			"Read",
			"Edit",
		]);
	});

	it("falls back to deprecated agent claude settings when claude config is absent", () => {
		const adapter = new ClaudeCodeAdapter({
			...config,
			agent: {
				model: "claude-sonnet-4-20250514",
				maxTurns: 7,
				allowedTools: ["Bash", "Read", "Edit"],
				permissionMode: "plan",
			},
		});

		expect(buildCommonArgs(adapter)).toEqual([
			"--output-format",
			"json",
			"--permission-mode",
			"plan",
			"--model",
			"claude-sonnet-4-20250514",
			"--max-turns",
			"7",
			"--allowedTools",
			"Bash",
			"Read",
			"Edit",
		]);
	});

	it("prefers primary claude config over deprecated agent claude settings", () => {
		const adapter = new ClaudeCodeAdapter({
			...config,
			agent: {
				model: "claude-opus-4-20250514",
				maxTurns: 3,
				allowedTools: ["Read", "Write"],
				permissionMode: "dontAsk",
			},
			claude: {
				model: "claude-sonnet-4-20250514",
				maxTurns: 11,
				allowedTools: ["Bash"],
				permissionMode: "plan",
			},
		});

		expect(buildCommonArgs(adapter)).toEqual([
			"--output-format",
			"json",
			"--permission-mode",
			"plan",
			"--model",
			"claude-sonnet-4-20250514",
			"--max-turns",
			"11",
			"--allowedTools",
			"Bash",
		]);
	});

	it("extracts normalized result fields from json output", () => {
		const json =
			'{"session_id":"abc-123","result":"done","usage":{"input_tokens":3,"output_tokens":4,"total_tokens":7}}';

		expect(extractSessionId(json)).toBe("abc-123");
		expect(extractUsage(json)).toEqual({
			inputTokens: 3,
			outputTokens: 4,
			totalTokens: 7,
		});
	});
});

function buildCommonArgs(adapter: ClaudeCodeAdapter): string[] {
	return (
		adapter as unknown as { buildCommonArgs: () => string[] }
	).buildCommonArgs();
}
