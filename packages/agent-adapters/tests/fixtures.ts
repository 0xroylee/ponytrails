import type { AgentAdapterRuntimeConfig } from "../src";

export const config: AgentAdapterRuntimeConfig = {
	workspacePath: "/tmp/work",
	executionPath: "/tmp/work/repo",
	codex: {
		binary: "codex",
		streamLogs: false,
		model: "gpt-5.4",
		reasoningEffort: "medium",
		models: {
			plan: "gpt-5.5",
			implement: "gpt-5.3-codex",
			reviewTest: "gpt-5.3-codex",
			githubComment: "gpt-5.4-mini",
		},
		reasoningEfforts: {
			plan: "high",
			implement: "low",
		},
		fastModes: {
			plan: true,
			implement: false,
			reviewTest: true,
			githubComment: false,
		},
		plugins: ["github@openai-curated"],
		skillsets: ["devos"],
		configOverrides: {
			"features.experimental_tools": "true",
		},
		sandbox: "workspace-write",
		codexHome: "/tmp/codex",
	},
};
