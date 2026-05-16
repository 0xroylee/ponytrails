"use client";

import {
	applyRealtimeEventToQueryClient,
	subscribeToRealtimeEvents,
	useRealtimeStore,
} from "@/lib/realtime";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useEffect } from "react";

type Props = {
	children: ReactNode;
};

export function RealtimeEventsProvider({ children }: Props): ReactElement {
	const queryClient = useQueryClient();

	useEffect(() => {
		const subscription = subscribeToRealtimeEvents({
			onEvent: (event) => {
				useRealtimeStore.getState().applyEvent(event);
				applyRealtimeEventToQueryClient(queryClient, event);
			},
			onStatus: (status) => {
				useRealtimeStore.getState().setConnectionStatus(status);
				if (status === "connected") {
					useRealtimeStore.getState().setConnectionError(null);
				}
			},
			onError: (error) => {
				useRealtimeStore.getState().setConnectionError(error);
			},
		});
		return () => {
			subscription.close();
		};
	}, [queryClient]);

	return <>{children}</>;
}
