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
});
