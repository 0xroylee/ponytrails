"use client";

import { FileText, PanelLeft } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { ChatRoomHeaderProps } from "./types/chat-room.types";

export function ChatRoomHeader({
	activeTaskId,
	isTaskDetailPanelOpen,
	projectId,
	title,
	onOpenSidebar,
	onToggleTaskDetails,
}: ChatRoomHeaderProps): ReactElement {
	return (
		<header className="flex items-center justify-between gap-3 px-4 py-2">
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
				<div className="min-w-0">
					<Typography className="truncate text-zinc-300">{title}</Typography>
					{/* <Typography className="mt-1 truncate" variant="muted">
						{projectId}
					</Typography> */}
				</div>
			</div>
			{activeTaskId ? (
				<Button
					aria-pressed={isTaskDetailPanelOpen}
					className="shrink-0"
					onClick={onToggleTaskDetails}
					type="button"
					variant="outline"
					size="sm"
				>
					<FileText size={16} />
					Details
				</Button>
			) : null}
		</header>
	);
}
