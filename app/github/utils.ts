import {Octokit} from '@octokit/rest';

export async function fetchRawPatch(owner: string, repo: string, pullno: string) {
    let url = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${pullno}.patch`

    const res = await fetch(url);
    if (!res.ok) {
        return;
    }
    const text = await res.text();

    return text;
}

export interface makeCommentParams {
    token: string,
    owner: string,
    repo: string,
    pullNo: string,
    summary: string
}

export async function makeComment(params: makeCommentParams) {
    const octokit = new Octokit({auth: params.token});

    await octokit.issues.createComment({
        owner: params.owner,
        repo: params.repo,
        issue_number: parseInt(params.pullNo),
        body: params.summary
    })
}