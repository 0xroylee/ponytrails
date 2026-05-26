import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MissionCheckpointPanel } from "../src/components/chat-room/chat-mission-checkpoint-panel";
import { missionPanelWidthClass } from "../src/components/chat-room/chat-mission-progress";
import {
	isActiveMissionStatus,
	isMissionVisibleStatus,
} from "../src/components/chat-room/chat-mission-progress-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import type { ChatStreamLine } from "../src/components/chat-room/types/chat-room.types";
import type { ChatMessageRecord } from "../src/lib/api";
import {
	chatMessage,
	chatSession,
	missionModel,
	textContent,
	tokenUsageRecord,
} from "./chat-mission-progress-fixtures";

describe("chat mission progress", () => {
	it("renders sticky mission progress before chat history", () => {
		const mission = missionModel();
		const html = renderTranscript({
			messages: [chatMessage({ content: "Chat before mission" })],
			missionProgress: mission,
		});

		expect(html).toContain('data-chat-mission-progress="true"');
		expect(html).toContain('data-chat-mission-progress-sticky="true"');
		expect(html).toContain('data-chat-mission-expanded="false"');
		expect(html).toContain('aria-label="Expand mission panel"');
		expect(html).toContain("sticky top-0");
		expect(html).toContain("max-w-4xl");
		expect(html).toContain("w-full");
		expect(html).toContain('data-chat-transcript-message-column="true"');
		expect(textContent(html)).toContain("Mission");
		expect(textContent(html)).toContain("TASK-42");
		expect(html.indexOf('data-chat-mission-progress="true"')).toBeLessThan(
			html.indexOf("Chat before mission"),
		);

		const emptyHtml = renderTranscript({ missionProgress: null });
		expect(emptyHtml).not.toContain('data-chat-mission-progress="true"');
	});

	it("resolves mission panel sizing for collapsed and expanded states", () => {
		expect(missionPanelWidthClass(false)).toBe("max-w-4xl");
		expect(missionPanelWidthClass(true)).toBe("max-w-6xl");
	});

	it("shows the selected-session welcome instead of an empty task prompt", () => {
		const html = renderTranscript({ missionProgress: null });
		const text = textContent(html);

		expect(text).toContain("Welcome, roy. I am devos.ing.");
		expect(text).not.toContain("Untitled");
		expect(text).not.toContain("Ready for a task.");
	});

	it("tracks active statuses and keeps terminal missions visible", () => {
		expect(isActiveMissionStatus("backlog")).toBe(false);
		expect(isActiveMissionStatus("plan")).toBe(false);
		expect(isActiveMissionStatus("done")).toBe(false);
		expect(isActiveMissionStatus("blocked")).toBe(false);
		expect(isActiveMissionStatus("in_progress")).toBe(true);
		expect(isActiveMissionStatus("in_review")).toBe(true);
		expect(isMissionVisibleStatus("done")).toBe(true);
		expect(isMissionVisibleStatus("failed")).toBe(true);
	});

	it("maps task activity into status, notes, logs, steps, and result", () => {
		const mission = missionModel();

		expect(mission.statusLabel).toBe("In Progress");
		expect(mission.notes[0]?.body).toContain("changed status");
		expect(mission.latestLogLines.at(-1)).toEqual(
			expect.objectContaining({ stream: "stderr", text: "Testing output" }),
		);
		expect(mission.latestResult).toEqual({
			label: "succeeded",
			tone: "success",
		});
		expect(mission.phases.map((phase) => phase.id)).toEqual([
			"plan",
			"implement",
			"testing",
			"qa",
		]);
		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"success",
			"success",
			"success",
		]);

		expect(mission.phaseLogLines.plan).toEqual([
			expect.objectContaining({ text: "Plan output" }),
		]);
		expect(mission.phaseLogLines.implement).toEqual([
			expect.objectContaining({ text: "Implement output" }),
		]);
		expect(mission.phaseLogLines.testing).toEqual([
			expect.objectContaining({ text: "Testing output" }),
		]);
		expect(mission.phaseCheckpoints.plan.map((item) => item.label)).toEqual([
			"Plan",
			"Split tasks",
		]);
		expect(
			mission.phaseCheckpoints.implement.map((item) => item.label),
		).toEqual(["Implementation", "Prepare pr"]);
		expect(mission.phaseCheckpoints.testing.map((item) => item.label)).toEqual([
			"Review testing",
		]);
		expect(mission.phaseCheckpoints.qa).toEqual([]);

		const html = renderTranscript({ missionProgress: mission });
		const text = textContent(html);
		expect(text).toContain("In Progress");
		expect(html).toContain('data-mission-log-panel="true"');
		expect(html).toContain('data-mission-checkpoints-panel="true"');
		expect(html).toContain('data-mission-workflow="true"');
		expect(html.indexOf('data-mission-workflow="true"')).toBeLessThan(
			html.indexOf('data-mission-checkpoints-panel="true"'),
		);
		expect(html.indexOf('data-mission-checkpoints-panel="true"')).toBeLessThan(
			html.indexOf('data-mission-log-panel="true"'),
		);
		expect(html).toContain('data-mission-phase="plan"');
		expect(html).toContain('data-mission-phase="implement"');
		expect(html).toContain('data-mission-phase="testing"');
		expect(html).toContain('data-mission-phase="qa"');
		expect(html).toContain('aria-pressed="true"');
		expect(text).toContain("QA checkpoints");
		expect(text).toContain("No checkpoints recorded for this stage.");
		expect(text).toContain("QA output");
		expect(text).toContain("No output recorded for this stage.");
		expect(text).not.toContain("Plan output");
		expect(text).not.toContain("Split tasks");
		expect(text).not.toContain("Review testing");
		expect(text).not.toContain("Progress steps");
	});

	it("truncates long checkpoint labels inside the checkpoint row", () => {
		const html = renderToStaticMarkup(
			createElement(MissionCheckpointPanel, {
				checkpoints: [
					{
						id: "checkpoint-long-label",
						label: "Plan a very long checkpoint label that should ellipsize",
						recordedAt: "2026-05-20T00:01:00.000Z",
						status: "running",
					},
				],
				phaseLabel: "Plan",
			}),
		);

		expect(html).toContain("overflow-hidden");
		expect(html).toContain("shrink-0");
		expect(html).toContain("block min-w-0 flex-1 truncate");
	});

	it("renders estimated usage on completed mission cards", () => {
		const mission = missionModel("succeeded", "done", [tokenUsageRecord()]);
		const html = renderTranscript({ missionProgress: mission });
		const text = textContent(html);

		expect(html).toContain('data-mission-usage-summary="true"');
		expect(text).toContain("Estimated usage");
		expect(text).toContain("$0.02");
		expect(text).toContain("1.3K");
	});

	it("uses live stream lines only for the selected running phase", () => {
		const mission = missionModel("running", "in_review");
		const html = renderTranscript({
			missionProgress: mission,
			streamLines: [
				{ id: "live-1", stream: "stdout", text: "Live output" },
				{ id: "live-2", stream: "stderr", text: "Live failure" },
			],
		});
		const text = textContent(html);

		expect(text).toContain("Live output");
		expect(text).toContain("Live failure");
		expect(text).not.toContain("Testing output");
	});

	it("derives QA status from the latest result without QA events", () => {
		const mission = missionModel("failed");

		expect(mission.latestResult).toEqual({
			label: "failed",
			tone: "error",
		});
		expect(mission.phases.find((phase) => phase.id === "qa")?.status).toBe(
			"failed",
		);

		const html = renderTranscript({ missionProgress: mission });
		expect(html).toContain('data-mission-phase="qa"');
		expect(html).toContain('data-mission-phase-status="failed"');
		expect(html).toContain("text-red-300");
	});
});

function renderTranscript({
	messages = [],
	missionProgress,
	streamLines = [],
}: {
	messages?: ChatMessageRecord[];
	missionProgress: ChatMissionProgressViewModel | null;
	streamLines?: ChatStreamLine[];
}): string {
	const queryClient = new QueryClient();
	return renderToStaticMarkup(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking: false,
				missionProgress,
				messages,
				session: chatSession(),
				streamLines,
				workingStartedAt: null,
				onDraftCommand: () => undefined,
			}),
		),
	);
}
