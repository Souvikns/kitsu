jest.mock("deepagents", () => ({
  createDeepAgent: jest.fn(() => ({
    invoke: jest.fn(),
  })),
}));

import { Agent } from "kitsu/agent";
import {
  Platform,
  type CommentInPrParams,
  type CreateReviewCommentParams,
  type FetchRawPatchParams,
} from "kitsu/models/platform";

class IntegrationPlatform extends Platform {
  public reviewComments: CreateReviewCommentParams[] = [];
  public prComments: CommentInPrParams[] = [];

  override async fetchRawPatch(_params: FetchRawPatchParams): Promise<string> {
    return `diff --git a/src/index.ts b/src/index.ts
index 111..222 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -3,1 +3,1 @@
-return oldValue;
+return newValue;
`;
  }

  override async commentInPr(params: CommentInPrParams): Promise<void> {
    this.prComments.push(params);
  }

  override async createReviewComment(
    params: CreateReviewCommentParams,
  ): Promise<void> {
    this.reviewComments.push(params);
  }
}

describe("review integration", () => {
  it("fetches a patch and posts inline comments plus fallback summary", async () => {
    const platform = new IntegrationPlatform();
    const agent = new Agent(
      {},
      platform,
      {
        invoke: jest.fn().mockResolvedValue({
          output: JSON.stringify({
            summary: "Found one safe inline review comment and one general note.",
            findings: [
              {
                body: "Confirm the new return value preserves caller expectations.",
                path: "src/index.ts",
                line: 3,
                side: "RIGHT",
              },
              {
                body: "Consider documenting the behavior change in the changelog.",
              },
            ],
          }),
        }),
      },
    );

    await agent.run({
      owner: "org",
      repo: "repo",
      pullNo: 10,
      token: "token",
      commitId: "sha",
    });

    expect(platform.reviewComments).toHaveLength(1);
    expect(platform.prComments).toHaveLength(1);
    expect(platform.prComments[0]?.summary).toContain(
      "Found one safe inline review comment",
    );
    expect(platform.prComments[0]?.summary).toContain(
      "Consider documenting the behavior change",
    );
  });
});
