"use client";

import {
	ChevronDown,
	ChevronRight,
	Folder,
	MessageSquarePlus,
	Search,
	Settings,
	X,
} from "lucide-react";
import { type ReactElement, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatRoomSessionRow } from "./chat-room-session-row";
import { ChatRoomSettingsSidebar } from "./chat-room-settings-sidebar";
import { buildChatSessionProjectGroups } from "./chat-room-sidebar-utils";
import type { ChatRoomSidebarProps } from "./types/chat-room-sidebar.types";
import type { ChatRoomSidebarView } from "./types/chat-room.types";

export function ChatRoomSidebar({
	activeSessionId,
	isCreating,
	projects,
	sessions,
	onNewSession,
	onArchiveSession,
	onCloseSidebar,
	onPinSession,
	onSearch,
	onSelectSession,
}: ChatRoomSidebarProps): ReactElement {
	const [sidebarView, setSidebarView] = useState<ChatRoomSidebarView>("main");
	const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(
		() => new Set(),
	);
	const isSettingsView = sidebarView === "settings";
	const sessionGroups = buildChatSessionProjectGroups({
		activeSessionId,
		projects,
		sessions,
	});

	function showMainSidebar(): void {
		setSidebarView("main");
	}

	function showSettingsSidebar(): void {
		setSidebarView("settings");
	}

	function handleCloseSidebar(): void {
		showMainSidebar();
		onCloseSidebar();
	}

	function handleSettingsNavigate(): void {
		showMainSidebar();
		onCloseSidebar();
	}

	function toggleProjectGroup(
		groupId: string,
		isActive: boolean,
		firstSessionId: string,
	): void {
		setCollapsedProjectIds((current) => {
			const next = new Set(current);
			if (!isActive || next.has(groupId)) {
				next.delete(groupId);
				return next;
			}
			next.add(groupId);
			return next;
		});
		if (firstSessionId !== activeSessionId) {
			onSelectSession(firstSessionId);
		}
	}

	return (
		<aside
			aria-label="Projects and sessions"
			className="fixed inset-y-0 left-0 z-40 grid min-h-0 w-[18rem] max-w-[calc(100vw-2rem)] -translate-x-full border-r border-border bg-surface-panel shadow-2xl transition-transform peer-checked:translate-x-0 md:static md:z-auto md:max-w-none md:translate-x-0 md:shadow-none"
		>
			<div className="relative h-full min-h-0 overflow-hidden">
				<div
					aria-hidden={isSettingsView}
					className={cn(
						"absolute inset-0 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] transition-transform duration-200 ease-out",
						isSettingsView
							? "pointer-events-none translate-x-full"
							: "translate-x-0",
					)}
					inert={isSettingsView ? true : undefined}
				>
					<div className="grid gap-2 border-b border-border p-3">
						<div className="flex min-w-0 gap-2">
							<Button
								className="min-w-0 flex-1 justify-start"
								disabled={isCreating}
								onClick={onNewSession}
								size="sm"
								type="button"
								variant="outline"
							>
								<MessageSquarePlus size={16} />
								New Session
							</Button>
							<Button
								aria-label="Close chat sidebar"
								className="md:hidden"
								onClick={handleCloseSidebar}
								size="icon"
								type="button"
								variant="ghost"
							>
								<X size={16} />
							</Button>
						</div>
						<Button
							className="w-full justify-start"
							onClick={onSearch}
							size="sm"
							type="button"
							variant="outline"
						>
							<Search size={16} />
							Search
						</Button>
					</div>
					<div className="min-h-0 overflow-auto p-3">
						<div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
							<Folder size={14} />
							Sessions
						</div>
						<div className="grid gap-1">
							{sessionGroups.map((group) => {
								const firstSessionId = group.sessions[0]?.id ?? "";
								const isExpanded =
									group.isActive && !collapsedProjectIds.has(group.id);
								const GroupIcon = isExpanded ? ChevronDown : ChevronRight;
								return (
									<div className="grid gap-1" key={group.id}>
										<Button
											aria-expanded={isExpanded}
											className={cn(
												"h-9 min-w-0 justify-start gap-2 px-2 text-left text-sm",
												group.isActive
													? "bg-surface-hover text-zinc-100"
													: "text-zinc-400 hover:bg-surface-hover hover:text-zinc-200",
											)}
											onClick={() =>
												toggleProjectGroup(
													group.id,
													group.isActive,
													firstSessionId,
												)
											}
											size="sm"
											title={group.label}
											type="button"
											variant="ghost"
										>
											<GroupIcon className="shrink-0" size={14} />
											<Folder className="shrink-0" size={14} />
											<span className="min-w-0 flex-1 truncate">
												{group.label}
											</span>
											<span className="shrink-0 rounded bg-surface-active px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
												{group.sessions.length}
											</span>
										</Button>
										{isExpanded ? (
											<div className="grid gap-1 pl-6">
												{group.sessions.map((session) => (
													<ChatRoomSessionRow
														activeSessionId={activeSessionId}
														key={session.id}
														session={session}
														onArchiveSession={onArchiveSession}
														onPinSession={onPinSession}
														onSelectSession={onSelectSession}
													/>
												))}
											</div>
										) : null}
									</div>
								);
							})}
							{sessions.length === 0 ? (
								<div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
									No sessions yet
								</div>
							) : null}
						</div>
					</div>
					<nav className="border-t border-border p-3">
						<Button
							className="h-9 w-full justify-start gap-2 px-2 text-xs text-zinc-400 hover:bg-surface-hover hover:text-zinc-200"
							onClick={showSettingsSidebar}
							size="sm"
							type="button"
							variant="ghost"
						>
							<Settings size={15} />
							<span className="min-w-0 flex-1 truncate text-left">
								Settings
							</span>
						</Button>
					</nav>
				</div>
				<ChatRoomSettingsSidebar
					isActive={isSettingsView}
					onBack={showMainSidebar}
					onClose={handleCloseSidebar}
					onNavigate={handleSettingsNavigate}
				/>
			</div>
		</aside>
	);
}
