import { Platform, type CommentInPrParams, type FetchRawPatchParams} from "./models/platform";
import { Octokit } from "@octokit/rest";

export class GithubPlatform extends Platform {
  override async fetchRawPatch(params: FetchRawPatchParams): Promise<string> {
    let url = `https://patch-diff.githubusercontent.com/raw/${params.owner}/${params.repo}/pull/${params.pullno}.patch`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Error fetching raw patch file.");
    }
    const text = await res.text();

    return text as string;
  }

  override async commentInPr(params: CommentInPrParams): Promise<void> {
    try {
      const octokit = new Octokit({ auth: params.token });

      await octokit.issues.createComment({
        owner: params.owner,
        repo: params.repo,
        issue_number: params.pullNo,
        body: params.summary,
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
