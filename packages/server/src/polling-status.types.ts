export interface PollingStatusRecord {
	id: string;
	sourceType: string;
	sourceId: string;
	projectId: string | null;
	state: string;
	intervalMs: number;
	lastStartedAt: string | null;
	lastFinishedAt: string | null;
	lastSuccessAt: string | null;
	lastErrorAt: string | null;
	lastIssueCount: number;
	lastStaleRetryCount: number;
	lastReadyTaskCount: number;
	lastDispatchCount: number;
	consecutiveFailures: number;
	lastError: string | null;
	updatedAt: string;
}

export interface PollingEventRecord {
	id: string;
	pollerId: string;
	sourceType: string;
	sourceId: string;
	projectId: string | null;
	level: string;
	eventType: string;
	message: string;
	metadata: Record<string, unknown>;
	createdAt: string;
}

export interface PollingStatusResponse {
	pollers: PollingStatusRecord[];
	events: PollingEventRecord[];
}
