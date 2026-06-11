"use client";

import { BookOpenText, RefreshCw, Route } from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import type { ApiRouteDoc, ApiRouteMethod } from "@/lib/api";
import { useApiDocsQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

interface ApiRouteGroup {
	group: string;
	routes: ApiRouteDoc[];
}

const methodClassByName: Record<ApiRouteMethod, string> = {
	DELETE: "border-red-900/70 bg-red-950/30 text-red-200",
	GET: "border-emerald-900/70 bg-emerald-950/30 text-emerald-200",
	PATCH: "border-amber-900/70 bg-amber-950/30 text-amber-200",
	POST: "border-sky-900/70 bg-sky-950/30 text-sky-200",
};

export function ApiDocsPanel(): ReactElement {
	const docsQuery = useApiDocsQuery({ refetchIntervalMs: false });

	if (docsQuery.isPending) {
		return <ApiDocsState message="Loading API reference..." title="Docs" />;
	}

	if (docsQuery.isError) {
		return (
			<ApiDocsState
				message={docsQuery.error.message || "Failed to load API reference."}
				title="Docs"
				tone="error"
			/>
		);
	}

	const groups = groupRoutes(docsQuery.data.routes);

	return (
		<section className="grid min-w-0 gap-4" aria-labelledby="api-docs-title">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div className="grid gap-1">
					<Typography
						as="h1"
						className="inline-flex items-center gap-2"
						id="api-docs-title"
						variant="pageTitle"
					>
						<BookOpenText size={18} />
						Docs
					</Typography>
					<Typography variant="description">
						Generated server API reference.
					</Typography>
				</div>
				<Typography className="inline-flex items-center gap-2 rounded-md px-3 py-2">
					<RefreshCw size={15} />
					{docsQuery.data.routes.length} endpoints
				</Typography>
			</header>
			<div className="grid min-w-0 gap-4">
				{groups.map((group) => (
					<ApiDocsGroup group={group} key={group.group} />
				))}
			</div>
		</section>
	);
}

function ApiDocsGroup({ group }: { group: ApiRouteGroup }): ReactElement {
	return (
		<section className="grid min-w-0 gap-3">
			<header className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
				<Route className="text-zinc-400" size={16} />
				<Typography as="h2" variant="sectionTitle">
					{group.group}
				</Typography>
				<Typography variant="metadata">{group.routes.length}</Typography>
			</header>
			<div className="grid min-w-0 gap-2">
				{group.routes.map((route) => (
					<ApiRouteCard key={`${route.method} ${route.path}`} route={route} />
				))}
			</div>
		</section>
	);
}

function ApiRouteCard({ route }: { route: ApiRouteDoc }): ReactElement {
	return (
		<article className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-4">
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<span
					className={cn(
						"inline-flex h-7 items-center rounded-md border px-2 font-mono text-xs font-medium",
						methodClassByName[route.method],
					)}
				>
					{route.method}
				</span>
				<Typography
					as="code"
					className="min-w-0 overflow-hidden break-all rounded-md bg-background px-2 py-1"
					variant="mono"
				>
					{route.path}
				</Typography>
			</div>
			<Typography variant="body">{route.summary}</Typography>
			<ApiRouteDetails route={route} />
		</article>
	);
}

function ApiRouteDetails({ route }: { route: ApiRouteDoc }): ReactElement {
	const details = [
		...(route.pathParams?.length
			? [{ label: "Path", value: route.pathParams.join(", ") }]
			: []),
		...(route.queryParams?.length
			? [{ label: "Query", value: route.queryParams.join(", ") }]
			: []),
		...(route.requestBody ? [{ label: "Body", value: route.requestBody }] : []),
		{ label: "Response", value: route.response },
	];

	return (
		<dl className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
			{details.map((detail) => (
				<div
					className="grid min-w-0 gap-1 border-l border-border pl-3"
					key={`${route.method}-${route.path}-${detail.label}`}
				>
					<Typography variant="metadata">{detail.label}</Typography>
					<Typography className="break-words" variant="tableCell">
						{detail.value}
					</Typography>
				</div>
			))}
		</dl>
	);
}

function ApiDocsState({
	message,
	title,
	tone = "default",
}: {
	message: string;
	title: string;
	tone?: "default" | "error";
}): ReactElement {
	const className =
		tone === "error"
			? "grid gap-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4"
			: "grid gap-3 rounded-lg border border-border bg-card p-4";

	return (
		<section className={className}>
			<Typography className="text-zinc-200" variant="sectionTitle">
				{title}
			</Typography>
			<Typography variant={tone === "error" ? "error" : "description"}>
				{message}
			</Typography>
		</section>
	);
}

function groupRoutes(routes: ApiRouteDoc[]): ApiRouteGroup[] {
	const groups = new Map<string, ApiRouteDoc[]>();
	for (const route of routes) {
		groups.set(route.group, [...(groups.get(route.group) ?? []), route]);
	}
	return [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([group, groupRoutes]) => ({ group, routes: groupRoutes }));
}
