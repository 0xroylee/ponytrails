import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const CLAUDE_BINARY_NAMES = ["claude"];

const COMMON_CLAUDE_PATHS = [
	// bun global cache (darwin-arm64)
	path.join(
		process.env.HOME ?? "",
		".cache/.bun/install/global/node_modules/@anthropic-ai/claude-code-darwin-arm64",
	),
	// bun global cache (linux-arm64)
	path.join(
		process.env.HOME ?? "",
		".cache/.bun/install/global/node_modules/@anthropic-ai/claude-code-linux-arm64",
	),
	// bun global cache (linux-x64)
	path.join(
		process.env.HOME ?? "",
		".cache/.bun/install/global/node_modules/@anthropic-ai/claude-code-linux-x64",
	),
	// npm global
	path.join(process.env.HOME ?? "", ".npm-global/bin"),
	// homebrew
	"/opt/homebrew/bin",
	"/usr/local/bin",
];

export function findClaudeBinary(): string | undefined {
	// 1. Check if claude is in PATH
	for (const name of CLAUDE_BINARY_NAMES) {
		try {
			const resolved = execSync(`which ${name}`, {
				encoding: "utf8",
				timeout: 5000,
			}).trim();
			if (resolved && existsSync(resolved)) {
				return resolved;
			}
		} catch {
			// not found in PATH
		}
	}

	// 2. Check common installation paths
	for (const dir of COMMON_CLAUDE_PATHS) {
		for (const name of CLAUDE_BINARY_NAMES) {
			const fullPath = path.join(dir, name);
			if (existsSync(fullPath)) {
				return fullPath;
			}
		}
	}

	// 3. Try to find via bun/npm global
	try {
		const bunGlobal = execSync("bun pm ls -g 2>/dev/null | grep claude", {
			encoding: "utf8",
			timeout: 5000,
		}).trim();
		if (bunGlobal) {
			// Extract path from bun output
			const match = bunGlobal.match(/\/[^\s]+claude[^\s]*/);
			if (match && existsSync(match[0])) {
				return match[0];
			}
		}
	} catch {
		// bun not available or claude not installed globally
	}

	return undefined;
}

export function getClaudeBinaryPath(configPath?: string): string {
	// 1. Use explicit config if provided
	if (configPath && existsSync(configPath)) {
		return configPath;
	}

	// 2. Auto-discover
	const discovered = findClaudeBinary();
	if (discovered) {
		return discovered;
	}

	// 3. Fallback to "claude" and hope it's in PATH when spawned
	return "claude";
}
