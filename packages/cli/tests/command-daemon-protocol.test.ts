import { describe, expect, it } from "bun:test";
import {
	parseCliDaemonInboundFrame,
	serializeCliDaemonFrame,
} from "../src/features/daemon";

describe("CLI daemon websocket protocol", () => {
	it("parses structured command frames", () => {
		const parsed = parseCliDaemonInboundFrame(
			JSON.stringify({
				type: "command",
				requestId: "req-1",
				request: { action: "projects" },
			}),
		);

		expect(parsed).toEqual({
			status: "ok",
			frame: {
				type: "command",
				requestId: "req-1",
				request: { action: "projects" },
			},
		});
	});

	it("rejects malformed command frames before execution", () => {
		expect(
			parseCliDaemonInboundFrame(
				JSON.stringify({
					type: "command",
					requestId: "req-1",
					request: { projectId: "default" },
				}),
			),
		).toEqual({
			status: "error",
			error: "Malformed daemon command frame: request.action is required",
		});
	});

	it("serializes outbound frames as JSON", () => {
		expect(
			serializeCliDaemonFrame({
				type: "stdout",
				requestId: "req-1",
				text: "hello",
			}),
		).toBe('{"type":"stdout","requestId":"req-1","text":"hello"}');
	});

	it("serializes workflow progress frames as JSON", () => {
		expect(
			serializeCliDaemonFrame({
				type: "progress",
				requestId: "req-1",
				event: {
					schema: "devos.workflow.stream.v1",
					emittedAt: "2026-05-16T00:00:00.000Z",
					kind: "stage",
					projectId: "default",
					issueKey: "TASK-1",
					stage: "planning",
					status: "started",
				},
			}),
		).toContain('"type":"progress"');
	});
});
