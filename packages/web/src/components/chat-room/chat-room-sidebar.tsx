"use client";

import type { SidebarNavItem } from "@/components/web-shell/types/web-shell.types";
import { navItems } from "@/components/web-shell/web-shell.constants";
import {
	BookOpen,
	Bot,
	ChartColumn,
	ChevronDown,
	ChevronRight,
	Computer,
	Folder,
	Inbox,
	ListChecks,
	MessageSquare,
	MessageSquarePlus,
	Search,
	Settings,
	Sparkles,
	SquareKanban,
	UsersRound,
	X,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactElement } from "react";

import { cn } from "@/lib/utils";

import { buildChatSessionProjectGroups } from "./chat-room-sidebar-utils";
import type { ChatRoomSidebarProps } from "./types/chat-room-sidebar.types";

const WORKSPACE_MENU_ID = "chat-workspace-menu";

const iconByKey: Record<
	SidebarNavItem["key"],
	ComponentType<{ size?: number }>
> = {
	agents: Bot,
	autopilot: Sparkles,
	chat: MessageSquare,
	inbox: Inbox,
	issues: ListChecks,
	projects: SquareKanban,
	runtimes: Computer,
	settings: Settings,
	skills: BookOpen,
	squads: UsersRound,
	usage: ChartColumn,
};

export function ChatRoomSidebar({
	activeSessionId,
	isCreating,
	projects,
	sidebarControlId,
	sessions,
	onNewSession,
	onCloseSidebar,
	onSearch,
	onSelectSession,
}: ChatRoomSidebarProps): ReactElement {
	const sessionGroups = buildChatSessionProjectGroups({
		activeSessionId,
		projects,
		sessions,
	});

	return (
		<aside
			aria-label="Projects and sessions"
			className="fixed inset-y-0 left-0 z-40 grid min-h-0 w-[18rem] max-w-[calc(100vw-2rem)] -translate-x-full border-r border-zinc-900 bg-[#15161a] shadow-2xl transition-transform peer-checked:translate-x-0 md:static md:z-auto md:max-w-none md:translate-x-0 md:shadow-none"
		>
			<div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
				<div className="grid gap-2 border-b border-zinc-900 p-3">
					<div className="flex min-w-0 gap-2">
						<button
							className="issue-tool-button min-w-0 flex-1 justify-start"
							disabled={isCreating}
							onClick={onNewSession}
							type="button"
						>
							<MessageSquarePlus size={16} />
							New Session
						</button>
						<label
							aria-label="Close chat sidebar"
							className="issue-icon-button cursor-pointer md:hidden"
							htmlFor={sidebarControlId}
						>
							<X size={16} />
						</label>
					</div>
					<button
						className="issue-tool-button w-full justify-start"
						onClick={onSearch}
						type="button"
					>
						<Search size={16} />
						Search
					</button>
				</div>
				<div className="min-h-0 overflow-auto p-3">
					<div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
						<Folder size={14} />
						Sessions
					</div>
					<div className="grid gap-1">
						{sessionGroups.map((group) => {
							const firstSessionId = group.sessions[0]?.id;
							const GroupIcon = group.isActive ? ChevronDown : ChevronRight;
							return (
								<div className="grid gap-1" key={group.id}>
									<button
										aria-expanded={group.isActive}
										className={cn(
											"flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm",
											group.isActive
												? "bg-zinc-900 text-zinc-100"
												: "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
										)}
										onClick={() => {
											if (!group.isActive && firstSessionId) {
												onSelectSession(firstSessionId);
											}
										}}
										title={group.label}
										type="button"
									>
										<GroupIcon className="shrink-0" size={14} />
										<Folder className="shrink-0" size={14} />
										<span className="min-w-0 flex-1 truncate">
											{group.label}
										</span>
										<span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] leading-none text-zinc-500">
											{group.sessions.length}
										</span>
									</button>
									{group.isActive ? (
										<div className="grid gap-1 pl-6">
											{group.sessions.map((session) => (
												<button
													aria-current={
														session.id === activeSessionId ? "page" : undefined
													}
													className={cn(
														"min-w-0 rounded-md px-2 py-2 text-left text-sm",
														session.id === activeSessionId
															? "bg-zinc-800 text-zinc-100"
															: "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
													)}
													key={session.id}
													onClick={() => onSelectSession(session.id)}
													type="button"
												>
													<span className="block truncate">
														{session.title}
													</span>
													<span className="mt-1 block truncate text-xs text-zinc-600">
														{session.taskId ?? "No issue"}
													</span>
												</button>
											))}
										</div>
									) : null}
								</div>
							);
						})}
						{sessions.length === 0 ? (
							<div className="rounded-md border border-dashed border-zinc-800 px-3 py-4 text-sm text-zinc-500">
								No sessions yet
							</div>
						) : null}
					</div>
				</div>
				<nav className="border-t border-zinc-900 p-3">
					<details className="group">
						<summary
							aria-controls={WORKSPACE_MENU_ID}
							className="flex h-9 w-full cursor-pointer list-none items-center gap-2 rounded-md px-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 group-open:bg-zinc-800 group-open:text-zinc-100 [&::-webkit-details-marker]:hidden"
						>
							<Settings size={15} />
							<span className="min-w-0 flex-1 truncate text-left">
								Settings
							</span>
							<ChevronDown
								className="transition-transform group-open:rotate-180"
								size={14}
							/>
						</summary>
						<div
							className="mt-2 max-h-[58dvh] overflow-auto"
							id={WORKSPACE_MENU_ID}
						>
							<div className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">
								Workspace
							</div>
							<div className="grid gap-1">
								{navItems.map((item) => {
									const Icon = iconByKey[item.key];
									const isActive = item.key === "chat";
									return (
										<Link
											aria-current={isActive ? "page" : undefined}
											className={cn(
												"flex h-9 items-center gap-2 rounded-md px-2 text-xs",
												isActive
													? "bg-zinc-800 text-zinc-100"
													: "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
											)}
											href={item.href}
											key={item.key}
											onClick={onCloseSidebar}
										>
											<Icon size={15} />
											<span className="truncate">{item.label}</span>
										</Link>
									);
								})}
							</div>
						</div>
					</details>
				</nav>
			</div>
		</aside>
	);
}
