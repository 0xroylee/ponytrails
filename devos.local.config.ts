import type { DevosRootConfig, DeepPartial } from "./packages/cli/src/features/types";

const cwd = process.cwd();

const config: DeepPartial<DevosRootConfig> = {
	"projects": [
		{
			"id": "default-project",
			"name": "Default Project",
			"workspacePath": "/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents",
			"executionPath": "/Users/roy/Desktop/SourceCode/agentic/show-me-ur-agents",
			"linear": {
				"statusMap": {
					"backlog": "Backlog",
					"assigned": "Todo",
					"planning": "In Progress",
					"implementing": "In Progress",
					"pr_created": "In Review",
					"reviewing": "In Review",
					"testing": "In Review",
					"blocked": "Canceled",
					"done": "Done"
				},
				"labelMap": {
					"pr_created": "PR Created",
					"reviewing": "Reviewing",
					"testing": "Testing"
				},
				"autoCreateLabels": true
			}
		}
	],
	"notifications": {
		"email": {
			"enabled": false,
			"to": []
		}
	},
	"codex": {
		"reasoningEfforts": {
			"plan": "low",
			"implement": "low",
			"reviewTest": "medium",
			"githubComment": "medium"
		},
		"models": {
			"plan": "gpt-5.5",
			"implement": "gpt-5.3-codex",
			"reviewTest": "gpt-5.3-codex",
			"githubComment": "gpt-5.3-codex"
		},
		"plugins": [
			"github@openai-curated",
			"linear@openai-curated"
		],
		"skillsets": [
			"devos"
		],
		"configOverrides": {
			"features.codex_hooks": "true"
		},
		"sandbox": "workspace-write"
	},
	"skills": {
		"root": `${cwd}/skills`,
		"plan": "piv-plan/SKILL.md",
		"implement": "piv-implement/SKILL.md",
		"reviewTest": "piv-review-test/SKILL.md",
		"githubComment": "piv-github-comment/SKILL.md",
		"createTask": "adhd-explore/SKILL.md"
	}
};

export default config;
