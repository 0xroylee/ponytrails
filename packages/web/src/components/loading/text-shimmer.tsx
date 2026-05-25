import { ShimmeringText } from "@/components/animate-ui/primitives/texts/shimmering";

import { cn } from "@/lib/utils";

export function TextShimmer({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<ShimmeringText
			aria-label={children}
			className={cn("font-medium", className)}
			color="#a1a1aa"
			duration={1}
			shimmeringColor="#f4f4f5"
			text={children}
		/>
	);
}
