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

class TestPlatform extends Platform {
  public patch = "";
  public reviewComments: CreateReviewCommentParams[] = [];
  public prComments: CommentInPrParams[] = [];

  override async fetchRawPatch(_params: FetchRawPatchParams): Promise<string> {
    return this.patch;
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

const patch = `diff --git a/src/index.ts b/src/index.ts
index 111..222 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
-const foo = 1;
+const foo = 2;
 console.log(foo);
+console.log("extra");
`;

describe("Agent", () => {
  it("posts inline review comments from valid JSON findings", async () => {
    const platform = new TestPlatform();
    platform.patch = patch;
    const agent = new Agent(
      {},
      platform,
      {
        invoke: jest.fn().mockResolvedValue({
          output: JSON.stringify({
            findings: [
              {
                body: "Use a named constant for clarity.",
                path: "src/index.ts",
                line: 2,
                side: "RIGHT",
              },
            ],
          }),
        }),
      },
    );

    await agent.run({
      owner: "org",
      repo: "repo",
      pullNo: 1,
      token: "token",
      commitId: "sha",
    });

    expect(platform.reviewComments).toHaveLength(1);
    expect(platform.reviewComments[0]).toMatchObject({
      body: "Use a named constant for clarity.",
      path: "src/index.ts",
      line: 2,
      side: "RIGHT",
      commitId: "sha",
    });
    expect(platform.prComments).toHaveLength(0);
  });

  it("falls back to a PR comment when the model returns plain text", async () => {
    const platform = new TestPlatform();
    platform.patch = patch;
    const agent = new Agent(
      {},
      platform,
      {
        invoke: jest.fn().mockResolvedValue({
          output: "No actionable issues found.",
        }),
      },
    );

    await agent.run({
      owner: "org",
      repo: "repo",
      pullNo: 2,
      token: "token",
      commitId: "sha",
    });

    expect(platform.reviewComments).toHaveLength(0);
    expect(platform.prComments).toHaveLength(1);
    expect(platform.prComments[0]?.summary).toContain("No actionable issues found.");
  });

  it("moves malformed findings into the general PR comment", async () => {
    const platform = new TestPlatform();
    platform.patch = patch;
    const agent = new Agent(
      {},
      platform,
      {
        invoke: jest.fn().mockResolvedValue({
          output: JSON.stringify({
            summary: "One inline finding could not be placed safely.",
            findings: [
              {
                body: "This line is outside the diff.",
                path: "src/index.ts",
                line: 99,
                side: "RIGHT",
              },
            ],
          }),
        }),
      },
    );

    await agent.run({
      owner: "org",
      repo: "repo",
      pullNo: 3,
      token: "token",
      commitId: "sha",
    });

    expect(platform.reviewComments).toHaveLength(0);
    expect(platform.prComments).toHaveLength(1);
    expect(platform.prComments[0]?.summary).toContain(
      "One inline finding could not be placed safely.",
    );
    expect(platform.prComments[0]?.summary).toContain("Line 99");
  });

  it("supports deleted lines on the LEFT side", async () => {
    const platform = new TestPlatform();
    platform.patch = patch;
    const agent = new Agent(
      {},
      platform,
      {
        invoke: jest.fn().mockResolvedValue({
          output: JSON.stringify({
            findings: [
              {
                body: "Deletion changed behavior.",
                path: "src/index.ts",
                line: 1,
                side: "LEFT",
              },
            ],
          }),
        }),
      },
    );

    await agent.run({
      owner: "org",
      repo: "repo",
      pullNo: 4,
      token: "token",
      commitId: "sha",
    });

    expect(platform.reviewComments).toHaveLength(1);
    expect(platform.reviewComments[0]?.side).toBe("LEFT");
    expect(platform.prComments).toHaveLength(0);
  });
});
