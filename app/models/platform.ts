export interface CommentInPrParams {
  token: string;
  owner: string;
  repo: string;
  pullNo: number;
  summary: string;
}

export interface FetchRawPatchParams {
  owner: string;
  repo: string;
  pullno: number;
  token?: string;
}

export interface CreateReviewCommentParams {
  token: string;
  owner: string;
  repo: string;
  pullNo: number;
  body: string;
  commitId: string;
  path: string;
  // Use either position OR line+side (and optional startLine/startSide) per GitHub API.
  position?: number;
  line?: number;
  side?: "RIGHT" | "LEFT";
  startLine?: number;
  startSide?: "RIGHT" | "LEFT";
}

export class Platform {
  fetchRawPatch(params: FetchRawPatchParams): Promise<string> {
    throw new Error("Method not implemented");
  }
  commentInPr(params: CommentInPrParams) {
    throw new Error('Method not implemented');
  }
  async createReviewComment(params: CreateReviewCommentParams) {
    throw new Error("Method not implemented");
  }
}
