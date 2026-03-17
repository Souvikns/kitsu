const requestMock = jest.fn();
const createCommentMock = jest.fn();
const createReviewCommentMock = jest.fn();

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    request: requestMock,
    rest: {
      issues: { createComment: createCommentMock },
      pulls: { createReviewComment: createReviewCommentMock },
    },
  })),
}));

import { GithubPlatform } from "kitsu/github";

describe("GithubPlatform", () => {
  beforeEach(() => {
    requestMock.mockReset();
    createCommentMock.mockReset();
    createReviewCommentMock.mockReset();
  });

  it("fetches a patch through the GitHub API when a token is provided", async () => {
    requestMock.mockResolvedValue({ data: "diff --git a/a b/a" });

    const platform = new GithubPlatform();
    const result = await platform.fetchRawPatch({
      owner: "org",
      repo: "repo",
      pullNo: 1,
      token: "token",
    });

    expect(result).toContain("diff --git");
    expect(requestMock).toHaveBeenCalledWith(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      expect.objectContaining({
        owner: "org",
        repo: "repo",
        pull_number: 1,
        headers: { accept: "application/vnd.github.v3.patch" },
      }),
    );
  });

  it("fetches a patch through fetch when no token is provided", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(({
      ok: true,
      text: jest.fn().mockResolvedValue("diff --git a/a b/a"),
    } as unknown as Response)) as unknown as typeof fetch;

    const platform = new GithubPlatform();
    const result = await platform.fetchRawPatch({
      owner: "org",
      repo: "repo",
      pullNo: 2,
    });

    expect(result).toContain("diff --git");
    expect(global.fetch).toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it("rejects invalid review comment locations", async () => {
    const platform = new GithubPlatform();

    await expect(
      platform.createReviewComment({
        owner: "org",
        repo: "repo",
        pullNo: 1,
        token: "token",
        commitId: "sha",
        body: "Review body",
        path: "src/index.ts",
      }),
    ).rejects.toThrow("exactly one location mode");
  });

  it("sends the expected GitHub review comment payload", async () => {
    createReviewCommentMock.mockResolvedValue({});

    const platform = new GithubPlatform();
    await platform.createReviewComment({
      owner: "org",
      repo: "repo",
      pullNo: 5,
      token: "token",
      commitId: "sha",
      body: "Review body",
      path: "src/index.ts",
      line: 10,
      side: "RIGHT",
    });

    expect(createReviewCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "org",
        repo: "repo",
        pull_number: 5,
        commit_id: "sha",
        path: "src/index.ts",
        line: 10,
        side: "RIGHT",
      }),
    );
  });
});
