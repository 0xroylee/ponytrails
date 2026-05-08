import { Database } from "bun:sqlite";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { IssueRef, ResolvedProjectConfig } from "../core/types";

const MAX_SKILL_CONTENT_CHARS = 4000;

const STOP_WORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"by",
	"for",
	"from",
	"in",
	"is",
	"it",
	"of",
	"on",
	"or",
	"that",
	"the",
	"to",
	"with",
	"workflow",
	"agent",
	"issue",
]);

export interface SkillCandidate {
	name: string;
	description?: string;
	content?: string;
	path?: string;
	tags: string[];
	source: "folder" | "database";
}

export interface RankedSkillCandidate extends SkillCandidate {
	score: number;
}

export interface SkillSelectionResult {
	selected: RankedSkillCandidate[];
	warnings: string[];
}

interface DatabaseSkillRow {
	name: string;
	description: string | null;
	content: string | null;
	path: string | null;
	tags: string | null;
}

export async function selectPlanningSupplementalSkills(
	config: ResolvedProjectConfig,
	issue: IssueRef,
): Promise<SkillSelectionResult> {
	const autoSelect = config.skills.autoSelect;
	if (!autoSelect?.enabled) {
		return { selected: [], warnings: [] };
	}

	const warnings: string[] = [];
	let candidates: SkillCandidate[] = [];

	if (autoSelect.sources.folder) {
		try {
			const fromFolder = await loadFolderSkillCandidates(
				config.skills.root,
				config.skills.plan,
			);
			candidates = candidates.concat(fromFolder);
		} catch (error) {
			warnings.push(
				`Folder skill source failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	if (autoSelect.sources.database) {
		try {
			const fromDatabase = await loadDatabaseSkillCandidates(
				autoSelect.databasePath,
			);
			candidates = candidates.concat(fromDatabase);
		} catch (error) {
			warnings.push(
				`Database skill source failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	const selected = rankSkillCandidates(
		candidates,
		issue,
		autoSelect.maxSelected,
	);
	return { selected, warnings };
}

export async function loadFolderSkillCandidates(
	root: string,
	basePlanSkillPath?: string,
): Promise<SkillCandidate[]> {
	const normalizedRoot = path.resolve(root);
	await access(normalizedRoot);
	const files = await collectSkillFiles(normalizedRoot);
	const normalizedBasePlanPath = basePlanSkillPath
		? path.resolve(basePlanSkillPath)
		: undefined;
	const candidates: SkillCandidate[] = [];
	for (const filePath of files) {
		if (
			normalizedBasePlanPath &&
			path.resolve(filePath) === normalizedBasePlanPath
		) {
			continue;
		}
		const raw = await readFile(filePath, "utf8");
		const parsed = parseSkillDocument(raw);
		candidates.push({
			name:
				parsed.name ??
				path.basename(path.dirname(filePath)).replace(/[-_]+/g, " ").trim(),
			description: parsed.description,
			content: clampText(raw, MAX_SKILL_CONTENT_CHARS),
			path: filePath,
			tags: [],
			source: "folder",
		});
	}
	return candidates;
}

export function loadDatabaseSkillCandidates(
	databasePath: string | undefined,
): SkillCandidate[] {
	if (!databasePath) {
		throw new Error(
			"databasePath is required when skills.autoSelect.sources.database is enabled.",
		);
	}

	const resolvedPath = path.resolve(databasePath);
	const db = new Database(resolvedPath, { readonly: true, create: false });
	try {
		const rows = db
			.query(
				"SELECT name, description, content, path, tags FROM skills WHERE name IS NOT NULL AND TRIM(name) != ''",
			)
			.all() as DatabaseSkillRow[];
		return rows.map((row) => ({
			name: row.name.trim(),
			description: row.description?.trim() || undefined,
			content: row.content?.trim() || undefined,
			path: row.path?.trim() || undefined,
			tags: parseTags(row.tags),
			source: "database",
		}));
	} catch (error) {
		throw new Error(
			`Failed to read skills table from '${resolvedPath}'. Expected schema: skills(name, description, content, path, tags). ${error instanceof Error ? error.message : String(error)}`,
		);
	} finally {
		db.close(false);
	}
}

export function rankSkillCandidates(
	candidates: SkillCandidate[],
	issue: IssueRef,
	maxSelected: number,
): RankedSkillCandidate[] {
	if (candidates.length === 0) {
		return [];
	}

	const queryTokens = tokenize(
		[issue.key, issue.title, issue.description].join(" "),
	);
	if (queryTokens.size === 0) {
		return [];
	}

	const deduped = dedupeCandidates(candidates);
	const scored: RankedSkillCandidate[] = deduped
		.map((candidate) => ({
			...candidate,
			score: scoreCandidate(candidate, queryTokens),
		}))
		.filter((candidate) => candidate.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			const sourceOrder = sourcePriority(a.source) - sourcePriority(b.source);
			if (sourceOrder !== 0) {
				return sourceOrder;
			}
			return a.name.localeCompare(b.name);
		});

	const limit =
		Number.isInteger(maxSelected) && maxSelected > 0 ? maxSelected : 3;
	return scored.slice(0, limit);
}

function scoreCandidate(
	candidate: SkillCandidate,
	queryTokens: Set<string>,
): number {
	const nameTokens = tokenize(candidate.name);
	const descriptionTokens = tokenize(candidate.description ?? "");
	const tagTokens = tokenize(candidate.tags.join(" "));
	const contentTokens = tokenize(candidate.content ?? "");
	const pathTokens = tokenize(candidate.path ?? "");

	let score = 0;
	score += overlapSize(queryTokens, nameTokens) * 4;
	score += overlapSize(queryTokens, descriptionTokens) * 3;
	score += overlapSize(queryTokens, tagTokens) * 2;
	score += overlapSize(queryTokens, contentTokens);
	score += overlapSize(queryTokens, pathTokens);
	return score;
}

function overlapSize(a: Set<string>, b: Set<string>): number {
	let count = 0;
	for (const token of a) {
		if (b.has(token)) {
			count += 1;
		}
	}
	return count;
}

function sourcePriority(source: SkillCandidate["source"]): number {
	return source === "folder" ? 0 : 1;
}

function dedupeCandidates(candidates: SkillCandidate[]): SkillCandidate[] {
	const selectedByName = new Map<string, SkillCandidate>();
	for (const candidate of candidates) {
		const key = candidate.name.trim().toLowerCase();
		if (!key) {
			continue;
		}
		const existing = selectedByName.get(key);
		if (!existing) {
			selectedByName.set(key, candidate);
			continue;
		}
		if (sourcePriority(candidate.source) < sourcePriority(existing.source)) {
			selectedByName.set(key, candidate);
			continue;
		}
		if (
			candidate.source === existing.source &&
			(candidate.description?.length ?? 0) > (existing.description?.length ?? 0)
		) {
			selectedByName.set(key, candidate);
		}
	}
	return Array.from(selectedByName.values());
}

function parseSkillDocument(input: string): {
	name?: string;
	description?: string;
} {
	const nameMatch = input.match(/^name:\s*(.+)$/im);
	const descriptionMatch = input.match(/^description:\s*(.+)$/im);
	return {
		name: nameMatch?.[1]?.trim() || undefined,
		description: descriptionMatch?.[1]?.trim() || undefined,
	};
}

function parseTags(raw: string | null): string[] {
	if (!raw || !raw.trim()) {
		return [];
	}
	const trimmed = raw.trim();
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (Array.isArray(parsed)) {
				return parsed
					.filter((item): item is string => typeof item === "string")
					.map((item) => item.trim())
					.filter(Boolean);
			}
		} catch {}
	}
	return trimmed
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

async function collectSkillFiles(root: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await readdir(root, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			const nested = await collectSkillFiles(fullPath);
			files.push(...nested);
			continue;
		}
		if (entry.isFile() && entry.name === "SKILL.md") {
			files.push(fullPath);
		}
	}
	return files;
}

function tokenize(input: string): Set<string> {
	const normalized = input.toLowerCase().replace(/[^a-z0-9]+/g, " ");
	const tokens = normalized
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
	return new Set(tokens);
}

function clampText(input: string, limit: number): string {
	const trimmed = input.trim();
	if (trimmed.length <= limit) {
		return trimmed;
	}
	return `${trimmed.slice(0, limit)}\n...[truncated]`;
}
