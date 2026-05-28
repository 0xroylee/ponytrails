import type { RunState } from "../../types";
import { isRunLeaseExpired } from "../state-lease";
import {
	isRunStateStaleForRetry as isRunStateStaleForRetryWithLease,
	selectStaleRunIssueKeys as selectStaleRunIssueKeysWithLease,
} from "../workflow-queue";

export function isRunStateStaleForRetry(
	state: RunState,
	nowMs: number,
	timeoutMs: number,
): boolean {
	return isRunStateStaleForRetryWithLease(
		state,
		nowMs,
		timeoutMs,
		isRunLeaseExpired,
	);
}

export function selectStaleRunIssueKeys(
	runStates: RunState[],
	nowMs: number,
	timeoutMs: number,
): string[] {
	return selectStaleRunIssueKeysWithLease(
		runStates,
		nowMs,
		timeoutMs,
		isRunLeaseExpired,
	);
}
