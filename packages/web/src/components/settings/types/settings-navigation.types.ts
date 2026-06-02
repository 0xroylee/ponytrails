export type SettingsView = "models" | "git";

export interface SettingsNavItem {
	key: SettingsView;
	label: string;
	href: "/settings" | "/settings/git";
}
