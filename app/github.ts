import {
  Platform,
  type CommentInPrParams,
  type FetchRawPatchParams,
  type CreateReviewCommentParams,
} from "./models/platform";
import { Octokit } from "@octokit/rest";

export class GithubPlatform extends Platform {
  override async fetchRawPatch(params: FetchRawPatchParams): Promise<string> {
    const url = `https://patch-diff.githubusercontent.com/raw/${params.owner}/${params.repo}/pull/${params.pullno}.patch`;

    if (params.token) {
      const octokit = new Octokit({ auth: params.token });
      const res = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        {
          owner: params.owner,
          repo: params.repo,
          pull_number: params.pullno,
          headers: {
            accept: "application/vnd.github.v3.patch",
          },
        },
      );

      if (typeof res.data !== "string" || !(res.data as string).trim()) {
        throw new Error("Error fetching raw patch file from GitHub API.");
      }

      return res.data;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Error fetching raw patch file.");
    }
    const text = await res.text();

    return text as string;
  }

  override async commentInPr(params: CommentInPrParams): Promise<void> {
    try {
      if (!params.token) {
        throw new Error(
          "Missing GitHub token. Provide github_token input or GITHUB_TOKEN env.",
        );
      }
      const octokit = new Octokit({ auth: params.token });

      await octokit.rest.issues.createComment({
        owner: params.owner,
        repo: params.repo,
        issue_number: params.pullNo,
        body: params.summary,
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }

  override async createReviewComment(
    params: CreateReviewCommentParams,
  ): Promise<void> {
    try {
      if (!params.token) {
        throw new Error(
          "Missing GitHub token. Provide github_token input or GITHUB_TOKEN env.",
        );
      }
      const octokit = new Octokit({ auth: params.token });

      const hasPosition = typeof params.position === "number";
      const hasLine = typeof params.line === "number";
      const hasSide = typeof params.side === "string";

      if (!hasPosition && !(hasLine && hasSide)) {
        throw new Error(
          "Review comment requires either position or line+side per GitHub API.",
        );
      }

      const location = hasPosition
        ? { position: params.position }
        : {
            line: params.line,
            side: params.side,
            start_line: params.startLine,
            start_side: params.startSide,
          };

      await octokit.rest.pulls.createReviewComment({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pullNo,
        body: params.body,
        commit_id: params.commitId,
        path: params.path,
        ...location,
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
