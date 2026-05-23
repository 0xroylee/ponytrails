import { describe, expect, it } from "bun:test";

import {
	THEME_STORAGE_KEY,
	getSystemTheme,
	isThemePreference,
	readThemePreference,
	resolveTheme,
} from "../src/lib/theme/theme";

describe("theme helpers", () => {
	it("validates theme preference values", () => {
		expect(isThemePreference("dark")).toBe(true);
		expect(isThemePreference("light")).toBe(true);
		expect(isThemePreference("system")).toBe(true);
		expect(isThemePreference("sepia")).toBe(false);
	});

	it("resolves system preference correctly", () => {
		expect(resolveTheme("dark", "light")).toBe("dark");
		expect(resolveTheme("light", "dark")).toBe("light");
		expect(resolveTheme("system", "dark")).toBe("dark");
		expect(resolveTheme("system", "light")).toBe("light");
	});

	it("reads stored theme preference with fallback", () => {
		expect(readThemePreference("light", "dark")).toBe("light");
		expect(readThemePreference("dark", "light")).toBe("dark");
		expect(readThemePreference("system", "dark")).toBe("system");
		expect(readThemePreference("invalid", "dark")).toBe("dark");
		expect(readThemePreference(null, "dark")).toBe("dark");
	});

	it("defaults system theme to dark when matchMedia is unavailable", () => {
		expect(getSystemTheme(undefined)).toBe("dark");
	});

	it("reads system theme from matchMedia", () => {
		const darkMatchMedia = (_query: string): MediaQueryList =>
			({ matches: true }) as MediaQueryList;
		const lightMatchMedia = (_query: string): MediaQueryList =>
			({ matches: false }) as MediaQueryList;
		expect(getSystemTheme(darkMatchMedia)).toBe("dark");
		expect(getSystemTheme(lightMatchMedia)).toBe("light");
	});

	it("uses stable localStorage key", () => {
		expect(THEME_STORAGE_KEY).toBe("devos-theme-preference");
	});
});
