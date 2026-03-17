import { Octokit } from "@octokit/rest";
import {
  Platform,
  type CommentInPrParams,
  type CreateReviewCommentParams,
  type FetchRawPatchParams,
} from "./models/platform";

export class GithubPlatform extends Platform {
  override async fetchRawPatch(params: FetchRawPatchParams): Promise<string> {
    const url = `https://patch-diff.githubusercontent.com/raw/${params.owner}/${params.repo}/pull/${params.pullNo}.patch`;

    if (params.token) {
      try {
        const octokit = new Octokit({ auth: params.token });
        const res = await octokit.request(
          "GET /repos/{owner}/{repo}/pulls/{pull_number}",
          {
            owner: params.owner,
            repo: params.repo,
            pull_number: params.pullNo,
            headers: {
              accept: "application/vnd.github.v3.patch",
            },
          },
        );
        const patch = typeof res.data === "string" ? res.data : "";

        if (!patch.trim()) {
          throw new Error("GitHub returned an empty patch response.");
        }

        return patch;
      } catch (error) {
        throw new Error(
          `Failed to fetch pull request patch from GitHub API: ${this.errorMessage(error)}`,
        );
      }
    }

    let res: Response;
    try {
      res = await fetch(url);
    } catch (error) {
      throw new Error(
        `Failed to fetch pull request patch from patch URL: ${this.errorMessage(error)}`,
      );
    }

    if (!res.ok) {
      throw new Error(
        `Failed to fetch pull request patch from patch URL: ${res.status} ${res.statusText}`,
      );
    }

    const text = await res.text();
    if (!text.trim()) {
      throw new Error("Patch URL returned an empty patch response.");
    }

    return text;
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
    } catch (error) {
      throw new Error(
        `Failed to create pull request comment: ${this.errorMessage(error)}`,
      );
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
      if (!params.body.trim()) {
        throw new Error("Review comment body cannot be empty.");
      }

      const hasPosition = typeof params.position === "number";
      const hasLine = typeof params.line === "number";
      const hasSide = typeof params.side === "string";
      const hasStartLine = typeof params.startLine === "number";
      const hasStartSide = typeof params.startSide === "string";

      if (hasPosition === (hasLine || hasSide)) {
        throw new Error(
          "Review comment requires exactly one location mode: position or line+side.",
        );
      }
      if ((hasStartLine || hasStartSide) && !(hasLine && hasSide)) {
        throw new Error("Multi-line review comments require line and side.");
      }
      if (hasStartLine !== hasStartSide) {
        throw new Error("startLine and startSide must be provided together.");
      }

      const octokit = new Octokit({ auth: params.token });
      const location = hasPosition
        ? { position: params.position }
        : {
            line: params.line,
            side: params.side,
            ...(hasStartLine ? { start_line: params.startLine } : {}),
            ...(hasStartSide ? { start_side: params.startSide } : {}),
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
    } catch (error) {
      throw new Error(
        `Failed to create review comment: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
