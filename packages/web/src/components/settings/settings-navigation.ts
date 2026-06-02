import type { SettingsNavItem } from "./types/settings-navigation.types";

export const settingsNavItems: SettingsNavItem[] = [
	{ key: "models", label: "Models", href: "/settings" },
	{ key: "git", label: "Git", href: "/settings/git" },
];

export function isSettingsNavItemActive(
	pathname: string,
	href: SettingsNavItem["href"],
): boolean {
	if (href === "/settings") {
		return pathname === "/settings" || pathname === "/settings/models";
	}

	return pathname === href || pathname.startsWith(`${href}/`);
}
