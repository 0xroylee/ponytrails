import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";

interface ProjectMetricProps {
	label: string;
	value: number;
}

export function ProjectMetric({
	label,
	value,
}: ProjectMetricProps): ReactElement {
	return (
		<span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-zinc-400">
			{label}
			<Typography as="span" className="text-zinc-100">
				{value}
			</Typography>
		</span>
	);
}
