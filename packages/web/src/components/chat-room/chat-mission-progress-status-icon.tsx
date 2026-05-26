"use client";

import { CheckCircle2, Circle, CircleAlert, Loader2 } from "lucide-react";
import type { ReactElement } from "react";

import type { ChatMissionPhaseStatus } from "./types/chat-mission-progress.types";

export function MissionStatusIcon({
	size = 16,
	status,
}: {
	size?: number;
	status: ChatMissionPhaseStatus;
}): ReactElement {
	if (status === "running") {
		return (
			<Loader2
				aria-hidden="true"
				className="animate-spin text-sky-300"
				size={size}
			/>
		);
	}
	if (status === "success") {
		return (
			<CheckCircle2
				aria-hidden="true"
				className="text-emerald-300"
				size={size}
			/>
		);
	}
	if (status === "failed") {
		return (
			<CircleAlert aria-hidden="true" className="text-red-300" size={size} />
		);
	}
	if (status === "warning") {
		return (
			<CircleAlert aria-hidden="true" className="text-amber-300" size={size} />
		);
	}
	return <Circle aria-hidden="true" className="text-zinc-500" size={size} />;
}
