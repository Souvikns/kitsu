jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("deepagents", () => ({
  createDeepAgent: jest.fn(() => ({
    invoke: jest.fn(),
  })),
}));

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
    rest: {
      issues: { createComment: jest.fn() },
      pulls: { createReviewComment: jest.fn() },
    },
  })),
}));

import { Agent } from "kitsu/agent";
import { getInputs, main } from "kitsu/main";
import type { Platform } from "kitsu/models/platform";

describe("main", () => {
  it("fails fast when no pull request context exists", () => {
    expect(() =>
      getInputs({
        context: {
          repo: { owner: "org", repo: "repo" },
          payload: {},
        } as never,
        coreModule: {
          getInput: jest.fn(),
        },
        env: {},
      }),
    ).toThrow("No pull request context found");
  });

  it("creates and runs only the review flow", async () => {
    const agentRun = jest.fn().mockResolvedValue(undefined);
    const agentFactory = jest.fn().mockReturnValue({
      run: agentRun,
    } as unknown as Agent);

    await main({
      context: {
        repo: { owner: "org", repo: "repo" },
        payload: {
          pull_request: {
            number: 42,
            head: { sha: "sha" },
          },
        },
      } as never,
      coreModule: {
        getInput: jest.fn((name: string) => {
          const values: Record<string, string> = {
            provider: "openai",
            api_key: "key",
            model: "gpt-4o-mini",
            github_token: "token",
          };
          return values[name] ?? "";
        }),
      },
      env: {},
      platform: {} as Platform,
      agentFactory,
    });

    expect(agentFactory).toHaveBeenCalledTimes(1);
    expect(agentRun).toHaveBeenCalledWith({
      owner: "org",
      repo: "repo",
      pullNo: 42,
      token: "token",
      commitId: "sha",
    });
  });
});
