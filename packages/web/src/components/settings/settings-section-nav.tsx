"use client";

import { GitBranch, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
	isSettingsNavItemActive,
	settingsNavItems,
} from "./settings-navigation";
import type { SettingsView } from "./types/settings-navigation.types";

const iconByKey: Record<SettingsView, ComponentType<{ size?: number }>> = {
	git: GitBranch,
	models: SlidersHorizontal,
};

export function SettingsSectionNav(): ReactElement {
	const pathname = usePathname();

	return (
		<nav className="grid gap-2">
			<Typography className="px-2" variant="eyebrow">
				Settings
			</Typography>
			<div className="grid gap-1">
				{settingsNavItems.map((item) => {
					const Icon = iconByKey[item.key];
					const isActive = isSettingsNavItemActive(pathname, item.href);
					return (
						<Link
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex h-9 items-center gap-2 rounded-md px-2 text-xs",
								isActive
									? "bg-surface-active text-zinc-100"
									: "text-muted-foreground hover:bg-surface-hover hover:text-zinc-200",
							)}
							href={item.href}
							key={item.key}
						>
							<Icon size={15} />
							<span className="truncate">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
