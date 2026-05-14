import type { ReactElement } from "react";

import { Skeleton } from "@/components/loading/skeleton";

export function AgentMonitorSkeleton(): ReactElement {
	return (
		<section style={{ maxWidth: "44rem", width: "100%" }}>
			<Skeleton className="mb-3 h-8 w-56" />
			<Skeleton className="mb-2 h-4 w-full max-w-lg" />
			<Skeleton className="mb-4 h-4 w-full max-w-md" />
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<Skeleton className="h-9 w-24" />
				<Skeleton className="h-9 w-20" />
				<Skeleton className="h-9 w-28" />
			</div>
			<Skeleton className="mb-2 h-4 w-40" />
			<Skeleton className="h-4 w-48" />
		</section>
	);
}
