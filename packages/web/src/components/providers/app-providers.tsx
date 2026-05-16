"use client";

import type { ReactElement, ReactNode } from "react";

import { AppQueryClientProvider } from "@/components/providers/query-client-provider";
import { RealtimeEventsProvider } from "@/components/providers/realtime-events-provider";

type Props = {
	children: ReactNode;
};

export function AppProviders({ children }: Props): ReactElement {
	return (
		<AppQueryClientProvider>
			<RealtimeEventsProvider>{children}</RealtimeEventsProvider>
		</AppQueryClientProvider>
	);
}
