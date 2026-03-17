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
  pullNo: number;
  token?: string;
}

export type ReviewSide = "RIGHT" | "LEFT";

export interface ReviewFinding {
  body: string;
  commitId: string;
  path: string;
  position?: number;
  line?: number;
  side?: ReviewSide;
  startLine?: number;
  startSide?: ReviewSide;
}

export interface ReviewResult {
  findings: ReviewFinding[];
  summary?: string;
  generalComments?: string[];
}

export interface CreateReviewCommentParams extends ReviewFinding {
  token: string;
  owner: string;
  repo: string;
  pullNo: number;
}

export abstract class Platform {
  abstract fetchRawPatch(params: FetchRawPatchParams): Promise<string>;
  abstract commentInPr(params: CommentInPrParams): Promise<void>;
  abstract createReviewComment(params: CreateReviewCommentParams): Promise<void>;
}
