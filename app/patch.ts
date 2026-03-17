import type { ReviewSide } from "./models/platform";

export interface FilteredPatch {
  filteredPatch: string;
  removedFiles: string[];
}

export interface PatchLineIndex {
  has(path: string, side: ReviewSide, line: number): boolean;
}

class ParsedPatchLineIndex implements PatchLineIndex {
  constructor(
    private readonly linesByPath: Map<
      string,
      { LEFT: Set<number>; RIGHT: Set<number> }
    >,
  ) {}

  has(path: string, side: ReviewSide, line: number): boolean {
    return this.linesByPath.get(path)?.[side].has(line) ?? false;
  }
}

const EXCLUDE_PATTERNS: RegExp[] = [
  /^package-lock.json$/i,
  /^yarn.lock$/i,
  /^pnpm-lock.yaml$/i,
  /\.lock$/i,
  /node_modules\//i,
  /\.(png|jpe?g|gif|svg|ico|zip|tgz|gz|woff2?|ttf|map)$/i,
];

const MAX_CHUNK_LENGTH = 20000;
const MAX_ADDED_LINES = 500;

export function filterReviewPatch(patch: string): FilteredPatch {
  if (!patch) return { filteredPatch: patch, removedFiles: [] };

  const chunks = patch.split(/(?=^diff --git )/m);
  const kept: string[] = [];
  const removed: string[] = [];

  for (const chunk of chunks) {
    const match = chunk.match(/^diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);
    const filename = match ? match[2] : null;

    let shouldExclude = false;
    if (filename) {
      shouldExclude = EXCLUDE_PATTERNS.some((pattern) => pattern.test(filename));
    }

    if (!shouldExclude && chunk.length > MAX_CHUNK_LENGTH) {
      shouldExclude = true;
    }

    if (!shouldExclude) {
      const addedLines = (chunk.match(/^\+[^+].*$/gm) || []).length;
      if (addedLines > MAX_ADDED_LINES) {
        shouldExclude = true;
      }
    }

    if (shouldExclude) {
      if (filename) removed.push(filename);
      continue;
    }

    kept.push(chunk);
  }

  return {
    filteredPatch: kept.join("\n").trim(),
    removedFiles: removed,
  };
}

export function buildPatchLineIndex(patch: string): PatchLineIndex {
  const linesByPath = new Map<string, { LEFT: Set<number>; RIGHT: Set<number> }>();

  let currentPath: string | null = null;
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  const ensurePath = (path: string) => {
    let entry = linesByPath.get(path);
    if (!entry) {
      entry = { LEFT: new Set<number>(), RIGHT: new Set<number>() };
      linesByPath.set(path, entry);
    }
    return entry;
  };

  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)\s*$/);
      currentPath = match?.[2] ?? null;
      inHunk = false;
      continue;
    }

    if (!currentPath) continue;

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
        inHunk = true;
      }
      continue;
    }

    if (!inHunk) continue;

    const entry = ensurePath(currentPath);

    if (line.startsWith("+") && !line.startsWith("+++")) {
      entry.RIGHT.add(newLine);
      newLine += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      entry.LEFT.add(oldLine);
      oldLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      entry.LEFT.add(oldLine);
      entry.RIGHT.add(newLine);
      oldLine += 1;
      newLine += 1;
    }
  }

  return new ParsedPatchLineIndex(linesByPath);
}
