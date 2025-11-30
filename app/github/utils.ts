
export async function fetchRawPatch(owner: string, repo: string, pullno: string) {
    let url = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${pullno}.patch`

    const res = await fetch(url);
    if (!res.ok) {
        return;
    }
    const text = await res.text();

    return text;
}