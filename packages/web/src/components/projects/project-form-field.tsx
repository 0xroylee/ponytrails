import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";

interface FieldProps {
	children: ReactElement;
	htmlFor?: string;
	label: string;
}

export function Field({ children, htmlFor, label }: FieldProps): ReactElement {
	return (
		<div className="grid gap-1">
			<Typography
				as="label"
				className="text-zinc-400"
				htmlFor={htmlFor}
				variant="label"
			>
				{label}
			</Typography>
			{children}
		</div>
	);
}
