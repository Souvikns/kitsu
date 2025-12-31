import { Kitsu } from "kitsu/kitsu";
import { GeminiProvider } from "kitsu/providers";
import { GithubPlatform } from "kitsu/github";

describe("Kitsu", () => {
  it("should initialize with proper inputs", () => {
    let provider = new GeminiProvider({
      apikey: "dummary-key",
      model: "dummy-model",
    });
    let platform = new GithubPlatform();
    let kitsu = new Kitsu(provider, platform);

    expect(kitsu).toBeDefined();
  });

  it("should generate summary", async () => {
    let provider = new GeminiProvider({
      apikey: "dummary-key",
      model: "dummy-model",
    });
    let platform = new GithubPlatform();
    let kitsu = new Kitsu(provider, platform);

    jest.spyOn(provider, "generateSummary").mockResolvedValue("dummy summary");

    let { summary } = await kitsu.generatePatchSummary({
      owner: "asyncapi",
      pullno: 1905,
      repo: "cli",
    });

    expect(summary).toBeDefined();
  });

  it("should filter out large/unhelpful files (like package-lock.json) before summarizing", async () => {
    let provider = new GeminiProvider({
      apikey: "dummary-key",
      model: "dummy-model",
    });

    // A raw patch with two file diffs: one package-lock and one source file
    const rawPatch = `diff --git a/package-lock.json b/package-lock.json
index 000..111 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
-"old": "1"
+"new": "2"

diff --git a/src/index.js b/src/index.js
index 222..333 100644
--- a/src/index.js
+++ b/src/index.js
@@ -1,3 +1,3 @@
-console.log('a')
+console.log('b')
`;

    const platform: any = {
      fetchRawPatch: jest.fn().mockResolvedValue(rawPatch),
      commentInPr: jest.fn(),
    };

    let kitsu = new Kitsu(provider, platform);

    const spy = jest
      .spyOn(provider, "generateSummary")
      .mockResolvedValue("dummy summary");


    await kitsu.generatePatchSummary({ owner: "org", pullno: 1, repo: "repo" });

    expect(platform.fetchRawPatch).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();

    // @ts-ignore
    let passedPatch = spy.mock.calls[0][0];

    expect(passedPatch).toContain("[OMITTED FILE DIFFS: package-lock.json]");
  });
});
