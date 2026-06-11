import type { ReactElement } from "react";

import { ApiDocsPanel } from "@/components/api-docs/api-docs-panel";

export default function DocsPage(): ReactElement {
	return (
		<section className="grid h-[100dvh] max-h-[100dvh] content-start gap-4 overflow-auto p-[clamp(0.75rem,3vw,1.25rem)]">
			<ApiDocsPanel />
		</section>
	);
}
