"use client";

import { useParams } from "next/navigation";
import type { ReactElement } from "react";

import { ChatRoomPanel } from "@/components/chat-room/chat-room-panel";
import { useOperatorIssueActions } from "@/components/web-shell/operator-issue-actions-context";

export default function SessionPage(): ReactElement {
	const { commandDraftRequest, requestOpenChatSidebar } =
		useOperatorIssueActions();
	const params = useParams<{ sessionId?: string | string[] }>();
	const sessionId = readSessionId(params.sessionId);

	return (
		<ChatRoomPanel
			commandDraftRequest={commandDraftRequest}
			initialSessionId={sessionId}
			key={sessionId}
			onOpenSidebar={requestOpenChatSidebar}
		/>
	);
}

function readSessionId(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}
