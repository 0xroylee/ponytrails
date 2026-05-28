import type { RunState } from "../types";

export function applyRunLease(
	state: RunState,
	ownerId: string,
	leaseTimeoutMs: number,
	nowMs = Date.now(),
): RunState {
	const nowIso = new Date(nowMs).toISOString();
	return {
		...state,
		lease: {
			ownerId,
			acquiredAt:
				state.lease?.ownerId === ownerId ? state.lease.acquiredAt : nowIso,
			heartbeatAt: nowIso,
			expiresAt: new Date(nowMs + leaseTimeoutMs).toISOString(),
		},
		updatedAt: nowIso,
	};
}

export function clearRunLease(state: RunState): RunState {
	return {
		...state,
		lease: undefined,
		updatedAt: new Date().toISOString(),
	};
}

export function isRunLeaseExpired(
	state: RunState,
	nowMs = Date.now(),
): boolean {
	if (!state.lease?.expiresAt) {
		return true;
	}
	const expiresAtMs = Date.parse(state.lease.expiresAt);
	if (Number.isNaN(expiresAtMs)) {
		return true;
	}
	return nowMs >= expiresAtMs;
}

export function hasRunLeaseConflict(
	state: RunState,
	ownerId: string,
	nowMs = Date.now(),
): boolean {
	if (!state.lease?.ownerId) {
		return false;
	}
	if (state.lease.ownerId === ownerId) {
		return false;
	}
	return !isRunLeaseExpired(state, nowMs);
}
