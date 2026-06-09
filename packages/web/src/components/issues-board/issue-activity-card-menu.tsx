"use client";

import { Copy, MoreHorizontal } from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { TaskActivityRecord } from "@/lib/api";

import { createActivityCopyText } from "./issue-activity-copy-utils";

export function IssueActivityCardMenu({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		function closeOnOutsidePointer(event: PointerEvent): void {
			const target = event.target;
			if (target instanceof Node && menuRef.current?.contains(target)) return;
			setIsOpen(false);
		}
		function closeOnEscape(event: KeyboardEvent): void {
			if (event.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("pointerdown", closeOnOutsidePointer);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePointer);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	function copyActivity(): void {
		setIsOpen(false);
		copyText(createActivityCopyText(activity));
	}

	return (
		<div className="relative shrink-0" ref={menuRef}>
			<Button
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-label="Open activity menu"
				onClick={() => setIsOpen((current) => !current)}
				size="icon"
				type="button"
				variant="ghost"
			>
				<MoreHorizontal size={18} />
			</Button>
			{isOpen ? (
				<div
					aria-label="Activity actions"
					className="absolute right-0 top-full z-30 mt-2 grid w-36 rounded-md border border-border bg-card p-1"
					role="menu"
				>
					<Button
						className="h-8 justify-start gap-2 px-2 text-sm text-zinc-300 hover:bg-surface-active"
						onClick={copyActivity}
						role="menuitem"
						size="sm"
						type="button"
						variant="ghost"
					>
						<Copy size={14} />
						<Typography as="span">Copy</Typography>
					</Button>
				</div>
			) : null}
		</div>
	);
}

function copyText(text: string): void {
	if (navigator.clipboard?.writeText) {
		void navigator.clipboard
			.writeText(text)
			.catch(() => copyTextWithInput(text));
		return;
	}
	copyTextWithInput(text);
}

function copyTextWithInput(text: string): void {
	const input = document.createElement("textarea");
	input.value = text;
	input.readOnly = true;
	input.style.position = "fixed";
	input.style.opacity = "0";
	input.style.pointerEvents = "none";
	document.body.appendChild(input);
	input.select();
	document.execCommand("copy");
	input.remove();
}
