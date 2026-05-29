# PIV Brainstorm Phase Design

## Scope

Add one required brainstorm workflow phase to the built-in PIV flow for chat-created tasks. The phase runs before planning and uses a local PIV brainstorming skill modeled after the Superpowers brainstorming workflow. It is a workflow role and phase, not a persistent `/api/agents` record.

## Goals

- Run exactly one brainstorm agent before the existing planning agent.
- Keep new chat session creation behavior intact: create the default chat task as today, then let the runner process it through the new first phase.
- Store brainstorm output in run state as `brainstormSummary` so subsequent workflow stages can consume it without changing the public chat API contract.
- When the brainstorm agent needs clarification, surface its question and model-provided options in the chatroom, mark the recommended option, and require the user to select an option or enter a custom answer before the workflow continues.
- Keep the workflow project-agnostic and aligned with existing skill path configuration.

## Non-Goals

- Do not create or update rows in the `agents` table when a chat session is created.
- Do not add a new Agents-page management surface for brainstorm agents.
- Do not change the stable planning parser markers such as `PLANNING_RESULT`, `SUCCESS_GOAL`, or `QUESTIONS_JSON`.
- Do not add parallel brainstorm agents in this pass.
- Do not route brainstorm clarification only through task comments, email, or terminal output.

## Architecture

Extend the built-in workflow metadata from `Plan -> Implement -> Testing` to `Brainstorm -> Plan -> Implement -> Testing`. Add a new `brainstorm` workflow role, a `brainstorm` built-in phase id, a local `brainstorm` run-state stage, and a configurable brainstorm skill path. The default path is `piv-brainstorm/SKILL.md`.

The brainstorm phase uses the same adapter bridge and chat-log path conventions as other workflow roles. Its final message is recorded as `RunState.brainstormSummary`, then the runner transitions the local run state to `plan`. Planning includes a concise brainstorm context section when `brainstormSummary` exists. Planning remains responsible for returning the existing READY or NEEDS_INFO contract.

Brainstorming has its own parser contract so it does not collide with planning markers: `BRAINSTORM_RESULT: READY` with a concise summary, or `BRAINSTORM_RESULT: NEEDS_INFO` with `QUESTIONS_JSON`. Each question can include `options`, and each option can include a `recommended` boolean from the model. A NEEDS_INFO result pauses the workflow at local stage `brainstorm`, publishes the current question to the chat session linked by `taskId`, and leaves the board task unavailable for normal workflow pickup until the chatroom answer is submitted.

## Components

- Workflow types: add `brainstorm` to workflow role, agent chat-log role, local workflow stage, and built-in phase types.
- Workflow metadata: insert a required `brainstormer` assignment before `planner`.
- Skill configuration: add `skills.brainstorm` to env/config defaults and tests.
- Prompt building: add a brainstorm prompt that loads `piv-brainstorm/SKILL.md` and asks for a concise design/requirements artifact.
- Brainstorm parsing: parse `BRAINSTORM_RESULT: READY|NEEDS_INFO` and `QUESTIONS_JSON` separately from planning output.
- Stage runner: add a brainstorm handler that runs the brainstorm agent, stores READY output, transitions to `plan`, or parks NEEDS_INFO questions for chatroom clarification.
- Workflow-data/server boundary: add a narrow task-linked chat clarification action that finds the active chat session by task id, appends an assistant clarification message, and sets `pendingQuestions`.
- Web clarification UI: reuse the existing option-button and custom-answer composer, preserving model-provided `recommended` flags so the recommended option is visibly marked.
- Chat answer handling: preserve submitted brainstorm clarification answers on the task or linked session context, clear `pendingQuestions`, return the board task to `plan`, and let the next workflow cycle resume local stage `brainstorm` with the answer included in the prompt.
- Planning prompt: include `brainstormSummary` context when it exists.
- Skill pack: add `skills/piv-brainstorm/SKILL.md` with a compact PIV-specific version of the Superpowers brainstorming process.

## Data Flow

1. A user creates a new chat session.
2. The server creates the same default backlog chat task and session as it does today.
3. The workflow runner picks up the board task while its server status remains `plan`.
4. New local run state starts at `brainstorm` for normal runs.
5. The brainstorm agent reads the task title, description, chat context, repo constraints, and brainstorming skill.
6. If brainstorm returns `BRAINSTORM_RESULT: READY`, the output is persisted to `brainstormSummary` in workflow state.
7. The runner transitions the local stage to `plan`.
8. The planning phase receives the brainstorm context and returns the existing planning contract.
9. If brainstorm returns `BRAINSTORM_RESULT: NEEDS_INFO`, the runner stores `brainstormNeedsInfoQuestions`, marks the board task out of the ready queue, and publishes the first pending question to the linked chat session.
10. The chatroom renders the existing clarification composer from `pendingQuestions`, including option buttons, a visible `Recommended` marker for model-recommended options, and a custom answer input.
11. The user either selects one option or enters a custom answer in the chatroom. The server records the answer, clears `pendingQuestions`, makes the task eligible for workflow pickup again, and keeps the answer available to the resumed brainstorm prompt.
12. The brainstorm agent runs again with prior brainstorm answers. If it asks another question, the same chatroom loop repeats.
13. When the brainstorm agent returns `BRAINSTORM_RESULT: READY`, the workflow proceeds to planning.
14. Implementation and review/testing continue unchanged after planning succeeds.

## Error Handling

The brainstorm phase is required. If the brainstorm agent fails, the pipeline fails the task using the same required-agent failure path used by planning, implementation, and testing. If the brainstorm agent asks for clarification, this is not a failure: the workflow pauses, the chat session receives pending questions, and the board task waits for the chatroom answer. A selected option and a custom answer are both sent back as clarification answers. The brainstorm loop can repeat until the agent has no more questions and returns READY. If stored brainstorm context is missing or empty on a resumed run, the planning phase runs with no context section rather than crashing.

## Testing

- Add a CLI workflow metadata test proving the built-in phase order is `brainstorm`, `plan`, `implement`, `testing`.
- Add config tests proving `skills.brainstorm` defaults to `piv-brainstorm/SKILL.md` and can be overridden.
- Add prompt tests proving the brainstorm prompt loads the skill and includes task context.
- Add parser tests for brainstorm READY and NEEDS_INFO output.
- Add stage tests proving READY records output and transitions to `plan`.
- Add stage or workflow-data tests proving NEEDS_INFO publishes chat pending questions and parks the task.
- Add chat route tests proving model options and `recommended` flags reach the chat session unchanged.
- Add web utility tests proving option selections and custom answers produce the payload sent back to the brainstorm agent.
- Add route or workflow tests proving repeated brainstorm NEEDS_INFO rounds stay in `brainstorm` and only transition to `plan` after READY.
- Keep existing chat session creation tests passing; creation still produces the same default task and session shape.

## Risks

- The current runner bootstraps normal runs at `plan`, so implementation must explicitly bootstrap new normal runs at `brainstorm` while keeping server board status eligibility at `plan`.
- Brainstorm output can become noisy if it is too long. The prompt asks for concise design context for the planner, not a full implementation plan.
- Config and skill path changes touch several contract surfaces; tests cover defaults and prompt generation together.
- Workflow clarification state spans CLI run state, server chat sessions, and board task status; the implementation keeps the boundary narrow and task-id based.
