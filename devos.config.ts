import path from "node:path";
import type {
	DeepPartial,
	DevosRootConfig,
} from "./packages/cli/src/features/types";

const cwd = process.cwd();

type ServerCronConfig = {
	automations: {
		jobs: Array<{
			id: string;
			name?: string;
			enabled?: boolean;
			schedule: Record<string, unknown>;
			run: Record<string, unknown>;
			skills?: Record<string, string>;
		}>;
	};
};

const config: DeepPartial<DevosRootConfig> & ServerCronConfig = {
	automations: {
		jobs: [
			{
				id: "hourly-pr-review",
				name: "Hourly PR Review",
				enabled: true,
				schedule: { frequency: "hourly", every: 1, minute: 0 },
				run: { allProjects: true, reviewOnly: true },
			},
		],
	},
	projects: [
		{
			id: "adhd-47ea7f022b5d",
			name: "Default Project",
		},
	],
	codex: {
		reasoningEfforts: {
			plan: "high",
		},
		models: {
			plan: "gpt-5.5",
			implement: "gpt-5.3-codex",
			reviewTest: "gpt-5.5",
		},
		plugins: ["github@openai-curated", "linear@openai-curated"],
		skillsets: ["devos"],
		configOverrides: {
			"features.codex_hooks": "true",
		},
	},
	skills: {
		plan: path.join(cwd, "skills", "piv-plan", "SKILL.md"),
		implement: path.join(cwd, "skills", "piv-implement", "SKILL.md"),
		reviewTest: path.join(cwd, "skills", "piv-review-test", "SKILL.md"),
	},
};

export default config;
