"use client";

import type { ReactElement } from "react";

import { AssistantTranscriptBubble } from "./chat-message-bubbles";
import type { ChatSessionAgentOutput } from "./types/chat-session-agent-output.types";

export function ChatSessionAgentOutputBubbles({
	outputs,
}: {
	outputs: ChatSessionAgentOutput[];
}): ReactElement | null {
	if (outputs.length === 0) return null;
	return (
		<>
			{outputs.map((output) => (
				<AgentOutputBubble key={output.id} output={output} />
			))}
		</>
	);
}

function AgentOutputBubble({
	output,
}: {
	output: ChatSessionAgentOutput;
}): ReactElement {
	return (
		<AssistantTranscriptBubble
			agentOutputId={output.id}
			content={output.text}
		/>
	);
}
