"use client";

import {
	Activity,
	Check,
	FileText,
	Loader2,
	MessageCircle,
	PanelLeft,
	Pencil,
	RotateCcw,
	X,
} from "lucide-react";
import { type FormEvent, type ReactElement, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { buildChatRoomHeaderTabs } from "./chat-room-header-tabs";
import type { ChatRoomHeaderTabKey } from "./types/chat-room-header-tabs.types";
import type { ChatRoomHeaderProps } from "./types/chat-room.types";

export function ChatRoomHeader({
	activeTaskId,
	activeTab,
	isRerunDisabled,
	isRerunning,
	isRerunVisible,
	isRenamingTitle,
	title,
	onOpenAction,
	onOpenMessages,
	onOpenSidebar,
	onOpenTaskDetails,
	onRenameTitle,
	onRerunWorkflow,
}: ChatRoomHeaderProps): ReactElement {
	const [draftTitle, setDraftTitle] = useState(title);
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const tabs = buildChatRoomHeaderTabs({
		activeTab,
		hasTaskDetails: Boolean(activeTaskId),
	});
	const trimmedDraftTitle = draftTitle.trim();

	function startEditingTitle(): void {
		setDraftTitle(title);
		setIsEditingTitle(true);
	}

	function cancelEditingTitle(): void {
		setDraftTitle(title);
		setIsEditingTitle(false);
	}

	async function saveTitle(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		if (!trimmedDraftTitle || isRenamingTitle) {
			return;
		}
		const didSave = await onRenameTitle(trimmedDraftTitle);
		if (didSave !== false) {
			setIsEditingTitle(false);
		}
	}

	function selectTab(key: ChatRoomHeaderTabKey): void {
		if (key === "taskDetails") {
			onOpenTaskDetails();
			return;
		}
		if (key === "action") {
			onOpenAction();
			return;
		}
		onOpenMessages();
	}

	return (
		<header className="grid border-b border-border">
			<div className="flex items-center justify-between gap-3 px-4 py-2">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<Button
						aria-label="Open chat sidebar"
						className="md:hidden"
						onClick={onOpenSidebar}
						size="icon"
						type="button"
						variant="ghost"
					>
						<PanelLeft size={17} />
					</Button>
					{isEditingTitle ? (
						<form
							className="flex min-w-0 flex-1 items-center gap-2"
							onSubmit={(event) => void saveTitle(event)}
						>
							<Input
								aria-label="Session title"
								className="h-8 min-w-0"
								disabled={isRenamingTitle}
								onChange={(event) => setDraftTitle(event.currentTarget.value)}
								value={draftTitle}
							/>
							<Button
								aria-label="Save session title"
								disabled={!trimmedDraftTitle || isRenamingTitle}
								size="icon"
								type="submit"
								variant="ghost"
							>
								{isRenamingTitle ? (
									<Loader2
										aria-hidden="true"
										className="animate-spin"
										size={15}
									/>
								) : (
									<Check aria-hidden="true" size={15} />
								)}
							</Button>
							<Button
								aria-label="Cancel session title edit"
								disabled={isRenamingTitle}
								onClick={cancelEditingTitle}
								size="icon"
								type="button"
								variant="ghost"
							>
								<X aria-hidden="true" size={15} />
							</Button>
						</form>
					) : (
						<>
							<div className="min-w-0">
								<Typography className="truncate text-zinc-300">
									{title}
								</Typography>
							</div>
							<Button
								aria-label="Edit session title"
								onClick={startEditingTitle}
								size="icon"
								type="button"
								variant="ghost"
							>
								<Pencil aria-hidden="true" size={14} />
							</Button>
						</>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{isRerunVisible ? (
						<Button
							aria-label="Rerun failed workflow"
							disabled={isRerunDisabled}
							onClick={onRerunWorkflow}
							size="icon"
							title="Rerun workflow"
							type="button"
							variant="outline"
						>
							{isRerunning ? (
								<Loader2
									aria-hidden="true"
									className="animate-spin"
									size={16}
								/>
							) : (
								<RotateCcw aria-hidden="true" size={16} />
							)}
						</Button>
					) : null}
				</div>
			</div>
			<nav aria-label="Session tabs" className="flex min-w-0 gap-1 px-4">
				{tabs.map((tab) => {
					const Icon =
						tab.key === "taskDetails"
							? FileText
							: tab.key === "action"
								? Activity
								: MessageCircle;
					return (
						<button
							aria-current={tab.isActive ? "page" : undefined}
							className={cn(
								"flex h-9 min-w-0 items-center gap-2 border-b-2 px-2 text-sm text-zinc-400 hover:text-zinc-100",
								tab.isActive
									? "border-zinc-200 text-zinc-100"
									: "border-transparent hover:border-zinc-600",
							)}
							key={tab.key}
							onClick={() => selectTab(tab.key)}
							type="button"
						>
							<Icon aria-hidden="true" size={15} />
							<span className="truncate">{tab.label}</span>
						</button>
					);
				})}
			</nav>
		</header>
	);
}
