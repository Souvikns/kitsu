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

    let summary = await this.provider.generateSummary(rawPatch);

    return {
      summary,
      makeComment: async (params: CommentInPrParams) =>
        this.platform.commentInPr(params),
    };
  }
}
