"use client";

import {
	type ReactElement,
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import {
	THEME_STORAGE_KEY,
	getSystemTheme,
	readThemePreference,
	resolveTheme,
} from "@/lib/theme/theme";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme.types";

type ThemeContextValue = {
	themePreference: ThemePreference;
	resolvedTheme: ResolvedTheme;
	setThemePreference: (themePreference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_ATTRIBUTE = "data-theme";

function applyResolvedTheme(theme: ResolvedTheme): void {
	document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

function readStoredThemePreference(): ThemePreference {
	return readThemePreference(localStorage.getItem(THEME_STORAGE_KEY), "dark");
}

export function ThemeProvider({
	children,
}: {
	children: ReactNode;
}): ReactElement {
	const [themePreference, setThemePreferenceState] =
		useState<ThemePreference>("dark");
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

	useEffect(() => {
		const systemTheme = getSystemTheme(window.matchMedia);
		const storedPreference = readStoredThemePreference();
		const nextTheme = resolveTheme(storedPreference, systemTheme);
		setThemePreferenceState(storedPreference);
		setResolvedTheme(nextTheme);
		applyResolvedTheme(nextTheme);
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = (): void => {
			if (themePreference !== "system") {
				return;
			}
			const nextTheme = resolveTheme(
				"system",
				getSystemTheme(window.matchMedia),
			);
			setResolvedTheme(nextTheme);
			applyResolvedTheme(nextTheme);
		};
		mediaQuery.addEventListener("change", onChange);
		return () => {
			mediaQuery.removeEventListener("change", onChange);
		};
	}, [themePreference]);

	const setThemePreference = useCallback(
		(nextPreference: ThemePreference): void => {
			const systemTheme = getSystemTheme(window.matchMedia);
			const nextResolvedTheme = resolveTheme(nextPreference, systemTheme);
			setThemePreferenceState(nextPreference);
			setResolvedTheme(nextResolvedTheme);
			localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
			applyResolvedTheme(nextResolvedTheme);
		},
		[],
	);

	const contextValue = useMemo<ThemeContextValue>(
		() => ({
			themePreference,
			resolvedTheme,
			setThemePreference,
		}),
		[resolvedTheme, setThemePreference, themePreference],
	);

	return (
		<ThemeContext.Provider value={contextValue}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const contextValue = useContext(ThemeContext);
	if (!contextValue) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return contextValue;
}
