import type { ResolvedProjectConfig, RunState } from "../../types";
import type {
	PipelineRunResult,
	WorkflowMetadata,
	WorkflowPhaseDefinition,
} from "../types/workflow-metadata.types";
import type { PhaseRunner } from "./phase-runner";

export interface PipelineManagerDeps {
	phaseRunner: PhaseRunner;
}

export class PipelineManager {
	constructor(
		private readonly metadata: WorkflowMetadata,
		private readonly deps: PipelineManagerDeps,
	) {}

	async run(input: {
		config: ResolvedProjectConfig;
		state: RunState;
		shouldContinue(state: RunState): boolean;
		beforePhase?(phase: WorkflowPhaseDefinition): Promise<"continue" | "skip">;
		afterPhase?(phase: WorkflowPhaseDefinition): Promise<void>;
	}): Promise<PipelineRunResult> {
		const phaseResults: PipelineRunResult["phaseResults"] = [];
		while (input.shouldContinue(input.state)) {
			const phase = this.phaseForStage(input.state.stage);
			if (!phase) {
				throw new Error(`Unsupported workflow stage: ${input.state.stage}`);
			}
			const beforePhase = await input.beforePhase?.(phase);
			if (beforePhase === "skip") {
				continue;
			}
			const result = await this.deps.phaseRunner.run({
				config: input.config,
				state: input.state,
				phase,
				metadata: this.metadata,
			});
			phaseResults.push(result);
			if (result.status === "rejected") {
				return { ok: false, phaseResults };
			}
			await input.afterPhase?.(phase);
		}
		return { ok: true, phaseResults };
	}

	private phaseForStage(
		stage: RunState["stage"],
	): WorkflowPhaseDefinition | null {
		return this.metadata.phases.find((phase) => phase.stage === stage) ?? null;
	}
}
