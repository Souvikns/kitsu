import { Provider } from "./models/provider";
import {
  Platform,
  type FetchRawPatchParams,
  type CommentInPrParams,
} from "./models/platform";

export class Kitsu {
  constructor(private provider: Provider, private platform: Platform) {}

  async generatePatchSummary(params: FetchRawPatchParams) {
    let rawPatch = await this.platform.fetchRawPatch(params);

    // Filter out patches from large or unhelpful files (locks, binaries, node_modules etc.)
    const { filteredPatch, removedFiles } = this.filterPatch(rawPatch);

    // Append a short note about omitted diffs so the model knows some files were skipped
    const finalPatch = removedFiles.length
      ? `${filteredPatch}\n\n[OMITTED FILE DIFFS: ${removedFiles.join(", ")}]`
      : filteredPatch;

    let summary = await this.provider.generateSummary(finalPatch);

    return {
      summary,
      makeComment: async (params: CommentInPrParams) =>
        this.platform.commentInPr(params),
    };
  }

  private filterPatch(patch: string) {
    if (!patch) return { filteredPatch: patch, removedFiles: [] };

    // Split patch into file-level chunks starting with 'diff --git '
    const chunks = patch.split(/(?=^diff --git )/m);

    const excludePatterns: RegExp[] = [
      /^package-lock.json$/i,
      /^yarn.lock$/i,
      /^pnpm-lock.yaml$/i,
      /\.lock$/i,
      /node_modules\//i,
      /\.(png|jpe?g|gif|svg|ico|zip|tgz|gz|woff2?|ttf|map)$/i,
    ];

    const MAX_CHUNK_LENGTH = 20000; // chars
    const MAX_ADDED_LINES = 500; // heuristic

    const kept: string[] = [];
    const removed: string[] = [];

    for (const chunk of chunks) {
      // Try to extract the filename from the diff header
      const m = chunk.match(/^diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);
      const filename = m ? m[2] : null;

      let shouldExclude = false;

      if (filename) {
        for (const p of excludePatterns) {
          if (p.test(filename)) {
            shouldExclude = true;
            break;
          }
        }
      }

      // Exclude if chunk is extremely large or has too many additions
      if (!shouldExclude) {
        if (chunk.length > MAX_CHUNK_LENGTH) shouldExclude = true;

        if (!shouldExclude) {
          const addedLines = (chunk.match(/^\+[^+].*$/gm) || []).length;
          if (addedLines > MAX_ADDED_LINES) shouldExclude = true;
        }
      }

      if (shouldExclude) {
        if (filename) removed.push(filename);
        continue;
      }

      kept.push(chunk);
    }

    const filteredPatch = kept.join("\n").trim();

    return { filteredPatch, removedFiles: removed };
  }
}
