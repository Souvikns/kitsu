import { Provider } from "kitsu/models/provider";

class TestProvider extends Provider {
  public prompts: Array<any[]> = [];
  private responses: Array<string | Error>;

  constructor(responses: Array<string | Error>) {
    super();
    this.responses = responses;
  }

  protected override async invokeModel(prompt: Array<any>): Promise<string> {
    this.prompts.push(prompt);
    const next = this.responses.shift();
    if (next instanceof Error) {
      throw next;
    }
    return (next ?? "") as string;
  }
}

const patch = `diff --git a/src/index.ts b/src/index.ts
index 111..222 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
-export const foo = 1;
+export const foo = 2;
`;

describe("Provider agentic summary flow", () => {
  it("uses agentic flow when analysis JSON is valid", async () => {
    const analysisJson = JSON.stringify({
      overall: "Update constant value.",
      files: [{ path: "src/index.ts", summary: "Adjust foo value." }],
      changes: ["Update foo export"],
      risks: [],
    });

    const provider = new TestProvider([analysisJson, "final summary"]);
    const summary = await provider.generateSummary(patch);

    expect(summary).toBe("final summary");
    expect(provider.prompts.length).toBe(2);
  });

  it("falls back to simple summary when analysis JSON is invalid", async () => {
    const provider = new TestProvider(["not json", "simple summary"]);
    const summary = await provider.generateSummary(patch);

    expect(summary).toBe("simple summary");
    expect(provider.prompts.length).toBe(2);
  });

  it("falls back to simple summary when analysis call throws", async () => {
    const provider = new TestProvider([
      new Error("boom"),
      "simple summary",
    ]);
    const summary = await provider.generateSummary(patch);

    expect(summary).toBe("simple summary");
    expect(provider.prompts.length).toBe(2);
  });
});
