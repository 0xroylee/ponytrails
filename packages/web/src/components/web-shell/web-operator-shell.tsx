"use client";

import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import { DEFAULT_WORKSPACE_ID } from "@/components/issues-board/issues-board.constants";
import type { OpenIssueRequest } from "@/components/issues-board/issues-board.types";
import { WebJobBoard } from "@/components/web-shell/web-job-board";
import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";
import { WebSidebar } from "@/components/web-shell/web-sidebar";
import {
	useCommandHistoryQuery,
	useProjectBoardQuery,
	useWorkspaceProjectsQuery,
} from "@/lib/api/queries";

import { CommandSearchDialog } from "./command-search-dialog";

const navItems: SidebarNavItem[] = [
	{ key: "inbox", label: "Inbox" },
	{ key: "issues", label: "Issues" },
	{ key: "projects", label: "Projects" },
	{ key: "autopilot", label: "Autopilot" },
	{ key: "agents", label: "Agents" },
	{ key: "squads", label: "Squads" },
	{ key: "usage", label: "Usage" },
	{ key: "runtimes", label: "Runtimes" },
	{ key: "skills", label: "Skills" },
	{ key: "settings", label: "Settings" },
];

const compactSidebarQuery = "(max-width: 900px)";

function visibleSidebarMode(isCompactViewport: boolean): SidebarDisplayMode {
	return isCompactViewport ? "collapsed" : "expanded";
}

function normalizeSidebarMode(
	mode: SidebarDisplayMode,
	isCompactViewport: boolean,
): SidebarDisplayMode {
	if (isCompactViewport && mode === "expanded") {
		return "collapsed";
	}
	return mode;
}

function nextSidebarMode(
	mode: SidebarDisplayMode,
	isCompactViewport: boolean,
): SidebarDisplayMode {
	const normalizedMode = normalizeSidebarMode(mode, isCompactViewport);

	if (isCompactViewport) {
		if (normalizedMode === "hidden") {
			return "collapsed";
		}
		return "hidden";
	}
	if (normalizedMode === "expanded") {
		return "collapsed";
	}
	if (normalizedMode === "collapsed") {
		return "hidden";
	}
	return "expanded";
}

export function WebOperatorShell(): ReactElement {
	const [sidebarMode, setSidebarMode] =
		useState<SidebarDisplayMode>("expanded");
	const [activeNavKey, setActiveNavKey] =
		useState<SidebarNavItem["key"]>("issues");
	const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);
	const [createIssueRequest, setCreateIssueRequest] = useState(0);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [openIssueRequest, setOpenIssueRequest] =
		useState<OpenIssueRequest | null>(null);
	const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
	const [projectId, setProjectId] = useState<string | null>(null);
	const projectsQuery = useWorkspaceProjectsQuery(workspaceId);
	const selectedProjectId = projectId ?? projectsQuery.data?.[0]?.id ?? null;
	const searchBoardQuery = useProjectBoardQuery(
		workspaceId,
		selectedProjectId,
		{
			enabled: isSearchOpen,
			refetchIntervalMs: false,
		},
	);
	const commandHistoryQuery = useCommandHistoryQuery({
		enabled: isSearchOpen,
		refetchIntervalMs: false,
	});
	const canShowSidebar = sidebarMode !== "hidden";
	const showFloatingToggle = sidebarMode === "hidden";

	useEffect(() => {
		const mediaQuery = window.matchMedia(compactSidebarQuery);
		const syncViewport = (): void => {
			const isCompact = mediaQuery.matches;
			setIsCompactViewport(isCompact);
			setSidebarMode((current) => normalizeSidebarMode(current, isCompact));
		};
		syncViewport();
		mediaQuery.addEventListener("change", syncViewport);
		return () => {
			mediaQuery.removeEventListener("change", syncViewport);
		};
	}, []);

	const showSidebar = useCallback(() => {
		setSidebarMode(visibleSidebarMode(isCompactViewport));
	}, [isCompactViewport]);

	const toggleSidebarMode = useCallback(() => {
		setSidebarMode((current) => nextSidebarMode(current, isCompactViewport));
	}, [isCompactViewport]);

	const createIssue = useCallback(() => {
		setActiveNavKey("issues");
		setCreateIssueRequest((value) => value + 1);
	}, []);

	const openIssue = useCallback((taskId: string) => {
		setActiveNavKey("issues");
		setOpenIssueRequest((current) => ({
			taskId,
			requestId: (current?.requestId ?? 0) + 1,
		}));
	}, []);

	const changeWorkspaceId = useCallback((nextWorkspaceId: string) => {
		setWorkspaceId(nextWorkspaceId);
		setProjectId(null);
	}, []);

	const viewportColumns = useMemo(() => {
		return canShowSidebar ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)";
	}, [canShowSidebar]);

	return (
		<main
			style={{
				height: "100dvh",
				maxHeight: "100dvh",
				display: "grid",
				gridTemplateColumns: viewportColumns,
				background: "#0f1013",
				position: "relative",
				overflowX: "clip",
			}}
		>
			{showFloatingToggle ? (
				<button
					type="button"
					aria-label="Show sidebar"
					onClick={showSidebar}
					style={{
						position: "fixed",
						top: "0.75rem",
						left: "0.75rem",
						zIndex: 10,
						padding: "0.5rem 0.7rem",
						border: "1px solid #3f3f46",
						borderRadius: "6px",
						background: "#18191d",
						color: "#f4f4f5",
						cursor: "pointer",
					}}
				>
					Show Nav
				</button>
			) : null}
			{canShowSidebar ? (
				<WebSidebar
					mode={sidebarMode}
					activeKey={activeNavKey}
					navItems={navItems}
					onNavSelect={setActiveNavKey}
					onNewIssue={createIssue}
					onSearch={() => setIsSearchOpen(true)}
					onToggleMode={toggleSidebarMode}
				/>
			) : null}
			<WebJobBoard
				activeKey={activeNavKey}
				createIssueRequest={createIssueRequest}
				isProjectsLoading={projectsQuery.isLoading}
				onProjectIdChange={setProjectId}
				onWorkspaceIdChange={changeWorkspaceId}
				openIssueRequest={openIssueRequest}
				projectId={selectedProjectId}
				projects={projectsQuery.data}
				projectsError={projectsQuery.error}
				workspaceId={workspaceId}
			/>
			<CommandSearchDialog
				activeKey={activeNavKey}
				board={searchBoardQuery.data}
				boardError={searchBoardQuery.error}
				commandHistory={commandHistoryQuery.data}
				commandHistoryError={commandHistoryQuery.error}
				isBoardLoading={searchBoardQuery.isLoading}
				isCommandHistoryLoading={commandHistoryQuery.isLoading}
				isOpen={isSearchOpen}
				navItems={navItems}
				onClose={() => setIsSearchOpen(false)}
				onNavigate={setActiveNavKey}
				onNewIssue={createIssue}
				onOpenIssue={openIssue}
			/>
		</main>
	);
}
