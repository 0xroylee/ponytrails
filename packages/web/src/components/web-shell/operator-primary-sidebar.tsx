"use client";

import {
	Asterisk,
	BookOpenText,
	Bot,
	Computer,
	GitBranch,
	ListChecks,
	Plug,
	SquareKanban,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { SidebarNavItem, SidebarNavKey } from "./types/web-shell.types";

const iconByKey: Partial<
	Record<SidebarNavItem["key"], ComponentType<{ size?: number }>>
> = {
	agents: Bot,
	docs: BookOpenText,
	git: GitBranch,
	issues: ListChecks,
	integrations: Plug,
	projects: SquareKanban,
	runtimes: Computer,
};

export function OperatorPrimarySidebar({
	activeKey,
	navItems,
}: {
	activeKey: SidebarNavKey;
	navItems: SidebarNavItem[];
}): ReactElement {
	return (
		<aside
			aria-label="Primary workspace navigation"
			className="z-50 grid h-[100dvh] w-20 shrink-0 grid-rows-[auto_minmax(0,1fr)] border-r border-border bg-background"
		>
			<div className="grid h-16 place-items-center border-b border-border">
				<Asterisk
					aria-hidden="true"
					className="text-[hsl(var(--accent-warm))]"
					size={25}
					strokeWidth={2.4}
				/>
			</div>
			<nav className="grid content-start gap-1 p-2">
				{navItems.map((item) => {
					const Icon = iconByKey[item.key] ?? SquareKanban;
					const isActive = item.key === activeKey;
					return (
						<Link
							aria-current={isActive ? "page" : undefined}
							aria-label={item.label}
							className={cn(
								"flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[11px] leading-tight transition-colors",
								isActive
									? "bg-surface-active text-zinc-100"
									: "text-zinc-400 hover:bg-surface-hover hover:text-zinc-100",
							)}
							href={item.href}
							key={item.key}
							title={item.label}
						>
							<Icon size={18} />
							<Typography
								as="span"
								className="w-full truncate text-[11px] leading-tight"
							>
								{item.label}
							</Typography>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
