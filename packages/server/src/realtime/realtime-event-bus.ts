import type {
	RealtimeEvent,
	RealtimeEventBus,
	RealtimeEventPayload,
} from "./realtime-events.types";

export function createRealtimeEventBus(
	now: () => string = () => new Date().toISOString(),
	createId: () => string = () => crypto.randomUUID(),
): RealtimeEventBus {
	const listeners = new Set<(event: RealtimeEvent) => void>();

	return {
		publish(payload: RealtimeEventPayload): void {
			const event = { ...payload, id: createId(), emittedAt: now() };
			for (const listener of listeners) {
				listener(event);
			}
		},
		subscribe(listener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
