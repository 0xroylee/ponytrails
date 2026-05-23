import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme.types";

export const THEME_STORAGE_KEY = "devos-theme-preference";

export function isThemePreference(value: unknown): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export function getSystemTheme(
	matchMediaFn: ((query: string) => MediaQueryList) | undefined,
): ResolvedTheme {
	if (!matchMediaFn) {
		return "dark";
	}
	return matchMediaFn("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function resolveTheme(
	preference: ThemePreference,
	systemTheme: ResolvedTheme,
): ResolvedTheme {
	if (preference === "system") {
		return systemTheme;
	}
	return preference;
}

export function readThemePreference(
	value: string | null,
	fallback: ThemePreference,
): ThemePreference {
	if (!value) {
		return fallback;
	}
	return isThemePreference(value) ? value : fallback;
}
