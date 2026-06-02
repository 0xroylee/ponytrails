import { describe, expect, it } from "bun:test";

import {
	isSettingsNavItemActive,
	settingsNavItems,
} from "../src/components/settings/settings-navigation";

describe("settings navigation", () => {
	it("includes a Git settings tab that links to the Git page", () => {
		expect(settingsNavItems).toContainEqual({
			href: "/settings/git",
			key: "git",
			label: "Git",
		});
	});

	it("keeps model and Git routes active independently", () => {
		expect(isSettingsNavItemActive("/settings", "/settings")).toBe(true);
		expect(isSettingsNavItemActive("/settings/models", "/settings")).toBe(true);
		expect(isSettingsNavItemActive("/settings/git", "/settings")).toBe(false);
		expect(isSettingsNavItemActive("/settings/git", "/settings/git")).toBe(
			true,
		);
	});
});
