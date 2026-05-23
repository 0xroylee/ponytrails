"use client";

import {
	BookOpen,
	Bot,
	ChartColumn,
	CircleHelp,
	CircleUserRound,
	Computer,
	Contrast,
	Inbox,
	ListChecks,
	Monitor,
	Moon,
	PanelLeft,
	PencilLine,
	Search,
	Settings,
	Sparkles,
	SquareKanban,
	Sun,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactElement } from "react";

import { useTheme } from "@/components/providers/theme-provider";
import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";
import { cn } from "@/lib/utils";
import { SidebarPinnedIssues } from "./web-sidebar-pins";

interface WebSidebarProps {
	mode: SidebarDisplayMode;
	activeKey: SidebarNavItem["key"];
	navItems: SidebarNavItem[];
	onNewIssue: () => void;
	onSearch: () => void;
	onToggleMode: () => void;
}

const iconByKey: Record<
	SidebarNavItem["key"],
	ComponentType<{ size?: number }>
> = {
	agents: Bot,
	runtimes: Computer,
	skills: BookOpen,
	settings: Settings,
	issues: ListChecks,
	projects: SquareKanban,
	inbox: Inbox,
	autopilot: Sparkles,
	squads: UsersRound,
	usage: ChartColumn,
};

function nextSidebarLabel(mode: SidebarDisplayMode): string {
	if (mode === "expanded") {
		return "Collapse sidebar";
	}
	if (mode === "collapsed") {
		return "Expand sidebar";
	}
	return "Show sidebar";
}

export function WebSidebar({
	mode,
	activeKey,
	navItems,
	onNewIssue,
	onSearch,
	onToggleMode,
}: WebSidebarProps): ReactElement {
	const isExpanded = mode === "expanded";
	const isHidden = mode === "hidden";
	const { setThemePreference, themePreference } = useTheme();

	function cycleTheme(): void {
		if (themePreference === "dark") {
			setThemePreference("light");
			return;
		}
		if (themePreference === "light") {
			setThemePreference("system");
			return;
		}
		setThemePreference("dark");
	}

	const ThemeIcon =
		themePreference === "dark"
			? Moon
			: themePreference === "light"
				? Sun
				: Monitor;
	const themeLabel =
		themePreference === "dark"
			? "Theme: dark"
			: themePreference === "light"
				? "Theme: light"
				: "Theme: system";

	return (
		<aside
			aria-label="Primary navigation"
			className="grid h-[100dvh] max-h-[100dvh] border-r border-theme-subtle bg-theme-panel text-theme-muted"
			style={{
				width: isHidden ? "0" : isExpanded ? "14rem" : "6.5rem",
				opacity: isHidden ? 0 : 1,
				pointerEvents: isHidden ? "none" : "auto",
				transition: "width 180ms ease, opacity 120ms ease",
				overflow: "hidden",
				gridTemplateRows: "auto auto 1fr auto",
			}}
		>
			<header className="flex items-center gap-3 p-4">
				<span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-theme-default bg-theme-interactive text-sm font-semibold text-theme-secondary">
					R
				</span>
				{isExpanded ? (
					<strong className="truncate text-xs font-medium text-theme-primary">
						Roy Lee&apos;s Workspace
					</strong>
				) : null}
				<button
					aria-label={`${themeLabel}. Switch theme`}
					className="grid h-8 w-8 place-items-center rounded-md border border-theme-default text-theme-muted hover-bg-theme-interactive hover:text-theme-secondary"
					onClick={cycleTheme}
					title={`${themeLabel}. Switch theme`}
					type="button"
				>
					{isExpanded ? <ThemeIcon size={16} /> : <Contrast size={16} />}
				</button>
				<button
					aria-label={nextSidebarLabel(mode)}
					className="grid h-8 w-8 place-items-center rounded-md hover-bg-theme-interactive"
					onClick={onToggleMode}
					title={nextSidebarLabel(mode)}
					type="button"
				>
					<PanelLeft size={16} />
				</button>
			</header>
			<div className="grid gap-2 px-3 pb-4">
				<SidebarAction
					icon={Search}
					isExpanded={isExpanded}
					label="Search..."
					onClick={onSearch}
				/>
				<SidebarAction
					icon={PencilLine}
					isExpanded={isExpanded}
					label="New Issue"
					onClick={onNewIssue}
				/>
				<SidebarPinnedIssues isExpanded={isExpanded} />
			</div>
			<nav className="grid content-start gap-6 px-3">
				<NavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(0, 7)}
					title="Workspace"
				/>
				<NavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(7)}
					title="Configure"
				/>
			</nav>
			<footer className="flex items-center justify-between p-4">
				{isExpanded ? (
					<span className="text-xs text-theme-muted">devos.ing</span>
				) : null}
				<CircleHelp size={16} />
			</footer>
		</aside>
	);
}

function NavGroup({
	title,
	items,
	activeKey,
	isExpanded,
}: {
	title: string;
	items: SidebarNavItem[];
	activeKey: SidebarNavItem["key"];
	isExpanded: boolean;
}): ReactElement {
	return (
		<div className="grid gap-1">
			{isExpanded ? (
				<p className="mb-1 px-2 text-[0.6875rem] font-medium text-theme-muted">
					{title}
				</p>
			) : null}
			{items.map((item) => {
				const Icon = iconByKey[item.key];
				const isActive = item.key === activeKey;
				return (
					<Link
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"flex h-10 items-center gap-3 rounded-md px-2 text-xs font-normal",
							isActive
								? "bg-theme-interactive text-theme-primary"
								: "text-theme-muted hover-bg-theme-subtle hover:text-theme-secondary",
							!isExpanded && "justify-center",
						)}
						href={item.href}
						key={item.key}
						title={item.label}
					>
						<Icon size={18} />
						{isExpanded ? <span>{item.label}</span> : null}
					</Link>
				);
			})}
		</div>
	);
}

function SidebarAction({
	icon: Icon,
	isExpanded,
	label,
	onClick,
}: {
	icon: ComponentType<{ size?: number }>;
	isExpanded: boolean;
	label: string;
	onClick?: () => void;
}): ReactElement {
	return (
		<button
			className={cn(
				"flex h-9 items-center gap-3 rounded-md px-2 text-xs font-normal text-theme-muted hover-bg-theme-subtle hover:text-theme-secondary",
				!isExpanded && "justify-center",
			)}
			onClick={onClick}
			type="button"
		>
			<Icon size={18} />
			{isExpanded ? <span>{label}</span> : null}
		</button>
	);
}
