"use client";

import type { ReactElement } from "react";

import { useWorkflowComputersQuery } from "@/lib/api/queries";

const DEVOS_ING_LOGO = [
	"█████████   █████████   ███     ███   ████████    █████████          ███   ███    ███    ████████",
	"███    ███  ███         ███     ███  ███    ███  ███    ███         ███   ████   ███   ███    ███",
	"███    ███  ███          ███   ███   ███    ███  ███                ███   █████  ███   ███",
	"███    ███  ████████      ███ ███    ███    ███  ████████           ███   ███ ██ ███   ███  █████",
	"███    ███  ███            █████     ███    ███         ███         ███   ███  █████   ███    ███",
	"███    ███  ███             ███      ███    ███  ███    ███   ███   ███   ███   ████   ███    ███",
	"█████████   █████████       ███       ████████    █████████    ███   ███   ███    ███    ████████",
].join("\n");

const DAEMON_SETUP_COMMANDS = [
	"npx devos onboard",
	"npx devos onboard --check",
	"devos daemon",
];

export function ChatEmptyTranscript(): ReactElement {
	const computersQuery = useWorkflowComputersQuery({ refetchIntervalMs: 5000 });
	const showDaemonSetup =
		computersQuery.isSuccess &&
		!computersQuery.data.some((computer) => computer.status === "online");

	return (
		<div className="grid justify-items-center pt-[26dvh] text-center">
			<pre
				aria-hidden="true"
				className="m-0 select-none whitespace-pre font-mono text-[5px] font-black leading-[1.08] text-[#5a5350] sm:text-[8px] md:text-[10px] lg:text-xs"
			>
				{DEVOS_ING_LOGO}
			</pre>
			<h1 className="sr-only">DEVOS.ING</h1>
			{showDaemonSetup ? (
				<pre className="mt-6 max-w-full overflow-x-auto rounded-md border border-border bg-surface-panel px-4 py-3 text-left font-mono text-xs leading-6 text-zinc-300">
					{DAEMON_SETUP_COMMANDS.join("\n")}
				</pre>
			) : null}
		</div>
	);
}
