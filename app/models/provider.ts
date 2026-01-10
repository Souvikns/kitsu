export interface ProviderParams {
  apikey: string;
  model: string;
}

type FileSummary = {
  path: string;
  summary: string;
};

type SummaryAnalysis = {
  overall: string;
  files: FileSummary[];
  changes: string[];
  risks: string[];
};

export class Provider {
  async generateSummary(patch: string): Promise<string> {
    try {
      return await this.generateAgenticSummary(patch);
    } catch (error) {
      return this.generateSimpleSummary(patch);
    }
  }

  protected async invokeModel(_prompt: Array<any>): Promise<string> {
    throw new Error("Method not implemented");
  }

  protected async generateSimpleSummary(patch: string): Promise<string> {
    let prompt = this.summaryPrompt(patch);
    return this.invokeModel(prompt);
  }

  protected async generateAgenticSummary(patch: string): Promise<string> {
    let analysisPrompt = this.analysisPrompt(patch);
    let analysisResponse = await this.invokeModel(analysisPrompt);
    let analysis = this.parseSummaryAnalysis(analysisResponse);

    if (!analysis) {
      return this.generateSimpleSummary(patch);
    }

    let finalPrompt = this.finalPrompt(patch, analysis);
    return this.invokeModel(finalPrompt);
  }

  protected summaryPrompt(patch: string): Array<any> {
    let system = {
      role: "system",
      content: `You are an expert software engineer who specializes in reading GitHub pull request patches.
Your job is to analyze a given patch file and produce a clear, concise, and technically accurate summary.
You must understand file-level changes, code modifications, additions, deletions, and overall intent.
`,
    };
    let user = {
      role: "human",
      content: `You are given a GitHub Pull Request patch file.

Your tasks:
1. Provide an overall high-level summary of what the PR does.
2. List all modified files with 1–2 line descriptions for each.
3. Highlight major code changes such as:
   - added features
   - removed logic
   - refactoring
   - renaming
   - dependency updates
   - important bug fixes
4. If applicable, describe potential risks or breaking changes.
5. Keep the summary readable and technical.

Here is the patch file:

{${patch}}
`,
    };
    return [system, user];
  }

  protected analysisPrompt(patch: string): Array<any> {
    let system = {
      role: "system",
      content: `You are a code review analyst. Extract structured notes from a GitHub pull request patch.
Return only valid JSON, with no markdown and no extra text.`,
    };
    let user = {
      role: "human",
      content: `Analyze the patch and produce JSON with this shape:
{
  "overall": "1-2 sentence overview",
  "files": [
    { "path": "file path", "summary": "1 sentence change summary" }
  ],
  "changes": ["major change 1", "major change 2"],
  "risks": ["risk or breaking change, or empty if none"]
}

Patch:

{${patch}}
`,
    };
    return [system, user];
  }

  protected finalPrompt(patch: string, analysis: SummaryAnalysis): Array<any> {
    let system = {
      role: "system",
      content: `You are an expert software engineer who writes concise GitHub pull request summaries.`,
    };
    let user = {
      role: "human",
      content: `You are given a patch and structured analysis.
Write a clear summary with:
1) High-level summary (2-3 sentences)
2) Modified files with 1-2 lines each
3) Major changes
4) Risks/breaking changes (if any)

Structured analysis:
${JSON.stringify(analysis, null, 2)}

Patch:
{${patch}}
`,
    };
    return [system, user];
  }

  private parseSummaryAnalysis(raw: string): SummaryAnalysis | null {
    let json = this.extractJsonObject(raw);
    if (!json) return null;

    try {
      let parsed = JSON.parse(json);
      return this.normalizeAnalysis(parsed);
    } catch (error) {
      return null;
    }
  }

  private extractJsonObject(raw: string): string | null {
    let start = raw.indexOf("{");
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < raw.length; i++) {
      let ch = raw[i];
      if (ch === "\\" && inString) {
        escaped = !escaped;
      } else {
        if (ch === '"' && !escaped) inString = !inString;
        escaped = false;
      }
      if (inString) continue;

      if (ch === "{") depth += 1;
      if (ch === "}") depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }

    return null;
  }

  private normalizeAnalysis(input: any): SummaryAnalysis | null {
    if (!input || typeof input !== "object") return null;

    let overall = typeof input.overall === "string" ? input.overall : "";
    let files = Array.isArray(input.files)
      ? input.files
          .map((file: any) => ({
            path: typeof file?.path === "string" ? file.path : "",
            summary: typeof file?.summary === "string" ? file.summary : "",
          }))
          .filter((file: FileSummary) => file.path && file.summary)
      : [];
    let changes = Array.isArray(input.changes)
      ? input.changes.filter((item: any) => typeof item === "string")
      : [];
    let risks = Array.isArray(input.risks)
      ? input.risks.filter((item: any) => typeof item === "string")
      : [];

    if (!overall && files.length === 0 && changes.length === 0 && risks.length === 0) {
      return null;
    }

    return { overall, files, changes, risks };
  }
}
