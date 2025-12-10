export interface CommentInPrParams {
  token: string;
  owner: string;
  repo: string;
  pullNo: number;
  summary: string;
}

export interface FetchRawPatchParams {
  owner: string,
  repo: string,
  pullno: number
}

export class Platform {
  fetchRawPatch(params: FetchRawPatchParams): Promise<string> {
    throw new Error("Method not implemented");
  }
  commentInPr(params: CommentInPrParams) {
    throw new Error('Method not implemented');
  }
}
