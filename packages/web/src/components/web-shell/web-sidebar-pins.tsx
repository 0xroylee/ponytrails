"use client";

import { Pin, X } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";

import { useUiStore } from "@/lib/ui-store";

export function SidebarPinnedIssues({
	isExpanded,
}: {
	isExpanded: boolean;
}): ReactElement | null {
	const pinnedIssues = useUiStore((state) => state.pinnedIssues);
	const unpinIssue = useUiStore((state) => state.unpinIssue);
	if (!isExpanded || pinnedIssues.length === 0) {
		return null;
	}
	return (
		<div className="grid gap-1 border-t border-theme-subtle pt-3">
			<p className="px-2 text-xs font-semibold text-theme-muted">Pinned</p>
			{pinnedIssues.map((issue) => (
				<div className="group flex items-center gap-1" key={issue.id}>
					<Link
						className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-theme-muted hover-bg-theme-subtle hover:text-theme-secondary"
						href={`/issues/${encodeURIComponent(issue.id)}`}
						title={issue.title}
					>
						<Pin className="shrink-0" size={13} />
						<span className="truncate">{issue.taskKey}</span>
						<span className="truncate text-theme-dim">{issue.title}</span>
					</Link>
					<button
						aria-label={`Unpin ${issue.taskKey}`}
						className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-theme-dim opacity-0 hover-bg-theme-subtle hover:text-theme-secondary group-hover:opacity-100"
						onClick={() => unpinIssue(issue.id)}
						type="button"
					>
						<X size={13} />
					</button>
				</div>
			))}
		</div>
	);
}
