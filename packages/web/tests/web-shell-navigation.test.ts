import { describe, expect, it } from "bun:test";

import {
	hrefForNavKey,
	navItems,
} from "../src/components/web-shell/web-shell.constants";

describe("web shell navigation", () => {
	it("exposes the Slack-style primary operator sections in order", () => {
		expect(navItems).toEqual([
			{ key: "projects", label: "Projects", href: "/projects" },
			{ key: "issues", label: "Issues", href: "/issues" },
			{ key: "integrations", label: "Integrations", href: "/integrations" },
			{ key: "docs", label: "Docs", href: "/docs" },
			{ key: "agents", label: "Agents", href: "/agents" },
			{ key: "runtimes", label: "Runtimes", href: "/runtimes" },
			{ key: "git", label: "Git", href: "/git" },
		]);
	});

	it("shows Git in workspace navigation and routes it to the Git instructions page", () => {
		expect(navItems).toContainEqual({
			key: "git",
			label: "Git",
			href: "/git",
		});
		expect(hrefForNavKey("git")).toBe("/git");
	});

	it("shows Issues in workspace navigation and routes it to the task board", () => {
		expect(navItems).toContainEqual({
			key: "issues",
			label: "Issues",
			href: "/issues",
		});
		expect(hrefForNavKey("issues")).toBe("/issues");
	});

	it("shows Docs in workspace navigation and routes it to API reference", () => {
		expect(navItems).toContainEqual({
			key: "docs",
			label: "Docs",
			href: "/docs",
		});
		expect(hrefForNavKey("docs")).toBe("/docs");
	});
});
