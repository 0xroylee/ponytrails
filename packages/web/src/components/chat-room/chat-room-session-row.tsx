"use client";

import { Archive, Pin, PinOff } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatRoomSessionRowProps } from "./types/chat-room-session-row.types";

export function ChatRoomSessionRow({
	activeSessionId,
	session,
	onArchiveSession,
	onPinSession,
	onSelectSession,
}: ChatRoomSessionRowProps): ReactElement {
	const isActive = session.id === activeSessionId;
	const PinIcon = session.pinned ? PinOff : Pin;
	const pinLabel = session.pinned
		? `Unpin ${session.title}`
		: `Pin ${session.title}`;

	return (
		<div
			className={cn(
				"rounded-md group grid min-w-0 grid-cols-[minmax(0,1fr)_2rem_2rem] gap-1 hover:bg-surface-hover hover:text-zinc-200",
				isActive ? "bg-surface-active text-zinc-100" : "text-zinc-400",
			)}
		>
			<Button
				className="h-auto min-w-0 justify-start px-2 py-2 text-left text-sm"
				onClick={() => onSelectSession(session.id)}
				type="button"
				variant="ghost"
			>
				<span className="min-w-0 flex-1">
					<span className="block truncate">{session.title}</span>
				</span>
			</Button>
			<Button
				aria-label={pinLabel}
				className={cn(
					"transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
					session.pinned ? "text-amber-300 opacity-100" : "opacity-0",
				)}
				onClick={() => onPinSession(session.id, !session.pinned)}
				size="icon"
				title={session.pinned ? "Unpin session" : "Pin session"}
				type="button"
				variant="ghost"
			>
				<PinIcon size={14} />
			</Button>
			<Button
				aria-label={`Archive ${session.title}`}
				className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
				onClick={() => onArchiveSession(session.id)}
				size="icon"
				title="Archive session"
				type="button"
				variant="ghost"
			>
				<Archive size={14} />
			</Button>
		</div>
	);
}
