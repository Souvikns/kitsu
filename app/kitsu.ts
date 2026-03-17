import { Provider } from "./models/provider";
import {
  Platform,
  type CommentInPrParams,
  type FetchRawPatchParams,
} from "./models/platform";
import { filterReviewPatch } from "./patch";

// Legacy summary-only flow retained for compatibility with existing consumers.
export class Kitsu {
  constructor(
    private readonly provider: Provider,
    private readonly platform: Platform,
  ) {}

  async generatePatchSummary(params: FetchRawPatchParams) {
    const rawPatch = await this.platform.fetchRawPatch(params);
    const { filteredPatch, removedFiles } = filterReviewPatch(rawPatch);

    const finalPatch = removedFiles.length
      ? `${filteredPatch}\n\n[OMITTED FILE DIFFS: ${removedFiles.join(", ")}]`
      : filteredPatch;

    const summary = await this.provider.generateSummary(finalPatch);

    return {
      summary,
      makeComment: async (commentParams: CommentInPrParams) =>
        this.platform.commentInPr(commentParams),
    };
  }
}
