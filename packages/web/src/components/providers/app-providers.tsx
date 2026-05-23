"use client";

import type { ReactElement, ReactNode } from "react";

import { AppQueryClientProvider } from "@/components/providers/query-client-provider";
import { RealtimeEventsProvider } from "@/components/providers/realtime-events-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

type Props = {
	children: ReactNode;
};

export function AppProviders({ children }: Props): ReactElement {
	return (
		<ThemeProvider>
			<AppQueryClientProvider>
				<RealtimeEventsProvider>{children}</RealtimeEventsProvider>
			</AppQueryClientProvider>
		</ThemeProvider>
	);
}
