"use client";

import { useState } from "react";

export function useWorkingSectionState(): {
	workingStartedAt: string | null;
	runWithWorkingLabel<T>(work: () => Promise<T>): Promise<T>;
} {
	const [workingStartedAt, setWorkingStartedAt] = useState<string | null>(null);

	async function runWithWorkingLabel<T>(work: () => Promise<T>): Promise<T> {
		setWorkingStartedAt(new Date().toISOString());
		try {
			return await work();
		} finally {
			setWorkingStartedAt(null);
		}
	}

	return { runWithWorkingLabel, workingStartedAt };
}
