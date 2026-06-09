# Chat Session Agent Bubbles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Chat tab show executing, thinking, and output updates as ordinary assistant-style bubbles while Task Info remains the structured detail surface.

**Architecture:** Keep `createChatSessionAgentOutputs` as the normalization boundary for conversation-worthy agent output. Promote only safe status/detail text from structured stream or mission log records, and render those normalized outputs through a reusable assistant bubble primitive in the existing transcript column.

**Tech Stack:** Next.js, React, TypeScript, Bun test runner, existing chat-room components.

---

## File Structure

- Modify `packages/web/tests/chat-session-agent-output-state.test.ts`
  - Owns focused helper behavior for converting mission/stream lines into transcript-safe agent outputs.
- Modify `packages/web/src/components/chat-room/chat-session-agent-output-state.ts`
  - Owns parsing, duplicate suppression, and safety filtering for agent output text.
- Modify `packages/web/src/components/chat-room/chat-message-bubbles.tsx`
  - Exposes a reusable assistant transcript bubble primitive without adding component tests.
- Modify `packages/web/src/components/chat-room/chat-session-agent-output-bubbles.tsx`
  - Renders live/mission agent output with the shared assistant bubble primitive.

No server code or Task Info code changes are planned.

### Task 1: Promote Safe Structured Agent Updates

**Files:**
- Modify: `packages/web/tests/chat-session-agent-output-state.test.ts`
- Modify: `packages/web/src/components/chat-room/chat-session-agent-output-state.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe("chat session agent output state", () => { ... })` block in `packages/web/tests/chat-session-agent-output-state.test.ts`:

```typescript
	it("surfaces safe structured workflow details without leaking commands", () => {
		const outputs = createChatSessionAgentOutputs({
			messages: [],
			missionProgress: null,
			planMessageContent: null,
			streamLines: [
				streamLine(
					"line-1",
					JSON.stringify({
						schema: "devos.workflow.stream.v1",
						kind: "action",
						status: "running",
						detail: "I am running the focused transcript tests now.",
						command: "codex exec --ask-for-approval never --prompt secret",
					}),
				),
				streamLine(
					"line-2",
					JSON.stringify({
						schema: "devos.workflow.stream.v1",
						kind: "action",
						status: "running",
						command: "codex exec --ask-for-approval never --prompt secret",
					}),
				),
			],
		});

		expect(outputs).toEqual([
			{
				id: "stream:line-1",
				text: "I am running the focused transcript tests now.",
			},
		]);
		expect(JSON.stringify(outputs)).not.toContain("codex exec");
	});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk bun test packages/web/tests/chat-session-agent-output-state.test.ts
```

Expected: FAIL because `createChatSessionAgentOutputs` currently ignores structured workflow records that are not explicit `agent_message` items.

- [ ] **Step 3: Implement minimal structured-detail parsing**

In `packages/web/src/components/chat-room/chat-session-agent-output-state.ts`, add these constants near `MAX_AGENT_OUTPUTS`:

```typescript
const SAFE_STRUCTURED_OUTPUT_FIELDS = ["text", "message", "detail", "summary"];
const WORKFLOW_STREAM_SCHEMA_PREFIX = "devos.workflow.stream.";
```

Replace `readStructuredAgentOutput` with:

```typescript
function readStructuredAgentOutput(rawText: string): string | null {
	const record = parseJsonRecord(rawText);
	if (!record) return null;
	const directType = readString(record, "type")?.toLowerCase();
	if (directType === "agent_message") {
		return readSafeStructuredOutputText(record, "text");
	}
	const item = readRecord(record, "item");
	if (item) {
		const itemType = readString(item, "type")?.toLowerCase();
		if (itemType === "agent_message") {
			return readSafeStructuredOutputText(item, "text");
		}
	}
	if (!isWorkflowStreamRecord(record)) return null;
	return readSafeStructuredOutputText(record);
}
```

Add these helpers below `readStructuredAgentOutput`:

```typescript
function isWorkflowStreamRecord(record: Record<string, unknown>): boolean {
	const schema = readString(record, "schema");
	if (schema?.startsWith(WORKFLOW_STREAM_SCHEMA_PREFIX)) return true;
	const kind = readString(record, "kind")?.toLowerCase();
	return kind === "thinking" || kind === "action" || kind === "output";
}

function readSafeStructuredOutputText(
	record: Record<string, unknown>,
	preferredField?: string,
): string | null {
	const fields = preferredField
		? [preferredField, ...SAFE_STRUCTURED_OUTPUT_FIELDS]
		: SAFE_STRUCTURED_OUTPUT_FIELDS;
	for (const field of fields) {
		const value = readTrimmedString(record, field);
		if (value) return value;
	}
	return null;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
rtk bun test packages/web/tests/chat-session-agent-output-state.test.ts
```

Expected: PASS. The output should include the safe `detail` field and should not include the `command` field.

- [ ] **Step 5: Confirm duplicate suppression still passes**

Run the same focused test file again after any cleanup:

```bash
rtk bun test packages/web/tests/chat-session-agent-output-state.test.ts
```

Expected: PASS, including the existing duplicate durable assistant content test.

### Task 2: Render Agent Outputs With the Shared Assistant Bubble

**Files:**
- Modify: `packages/web/src/components/chat-room/chat-message-bubbles.tsx`
- Modify: `packages/web/src/components/chat-room/chat-session-agent-output-bubbles.tsx`

- [ ] **Step 1: Extract the assistant bubble primitive**

In `packages/web/src/components/chat-room/chat-message-bubbles.tsx`, add this exported component above `PlanMessage`:

```tsx
export function AssistantTranscriptBubble({
	agentOutputId,
	content,
}: {
	agentOutputId?: string;
	content: string;
}): ReactElement {
	return (
		<article
			className="grid max-w-[min(42rem,90%)] justify-self-start rounded-md border border-border bg-surface-panel px-3 py-2 text-sm text-zinc-200"
			data-chat-agent-output={agentOutputId}
			data-chat-message-display="assistant"
		>
			<Typography className="whitespace-pre-wrap break-words leading-6">
				{content}
			</Typography>
		</article>
	);
}
```

Then update the non-user branch in `ChatMessageBubble` so it reuses the shared primitive:

```tsx
	if (!isUser && !isError) {
		return <AssistantTranscriptBubble content={message.content} />;
	}
```

Keep the existing `assistant-note`, `plan`, user, and error branches unchanged.

- [ ] **Step 2: Render live agent output through the shared primitive**

Replace the current `AgentOutputBubble` body in `packages/web/src/components/chat-room/chat-session-agent-output-bubbles.tsx` with:

```tsx
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
```

Update imports in that file to remove `Typography` and import the shared primitive:

```tsx
import { AssistantTranscriptBubble } from "./chat-message-bubbles";
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
rtk bun test packages/web/tests/chat-session-agent-output-state.test.ts
```

Expected: PASS. No component rendering tests are added because `packages/web/AGENTS.md` explicitly directs visible UI changes to typecheck/build/browser verification instead of React component markup tests.

- [ ] **Step 4: Run web typecheck**

Run:

```bash
rtk bun run --filter web typecheck
```

Expected: PASS with no TypeScript errors from the extracted bubble component or data attributes.

- [ ] **Step 5: Run web build**

Run:

```bash
rtk bun run --filter web build
```

Expected: PASS with no Next.js build errors.

### Task 3: Browser Verification And Handoff

**Files:**
- No new source files.

- [ ] **Step 1: Start or reuse the local web app**

Run the repo's existing web dev command with Bun if no suitable server is already running:

```bash
rtk bun run --filter web dev
```

Expected: The web app serves a local URL, typically `http://localhost:3000`.

- [ ] **Step 2: Inspect the Chat tab in the browser**

Open the session list in the browser:

```text
http://localhost:3000/session
```

Click an existing session row and make sure the `Chat` child route is selected.

Expected: Agent execution/thinking/output updates appear in the normal message column as left-aligned assistant-style bubbles. The Chat tab should not show raw command-only payloads.

- [ ] **Step 3: Inspect Task Info in the browser**

From the same selected session, click the `Task Info` child route in the session sidebar.

Expected: Structured workflow detail remains available in Task Info.

- [ ] **Step 4: Check final git state**

Run:

```bash
rtk git status --short --branch
```

Expected: Only the implementation files, tests, and the plan/spec docs from this scoped change should be new or modified beyond the pre-existing dirty files.
