import { createDeepAgent } from "deepagents";
import {
  Platform,
  type ReviewFinding,
  type ReviewResult,
  type ReviewSide,
} from "./models/platform";
import { buildPatchLineIndex, filterReviewPatch, type PatchLineIndex } from "./patch";

interface ReviewAgentRuntime {
  invoke(input: {
    messages: Array<{ role: string; content: string }>;
  }): Promise<unknown>;
}

export class Agent {
  private readonly agent: ReviewAgentRuntime;

  constructor(
    model: unknown,
    private readonly platform: Platform,
    runtime?: ReviewAgentRuntime,
  ) {
    this.agent =
      runtime ??
      (createDeepAgent({
        model: model as never,
        systemPrompt:
          "You are an expert Software Engineer and Code Reviewer responsible for reviewing GitHub Pull Requests. Your goal is to help maintain high code quality, reliability, and maintainability in the repository.",
        tools: [],
        subagents: [],
      }) as unknown as ReviewAgentRuntime);
  }

  async run(params: {
    owner: string;
    repo: string;
    pullNo: number;
    token: string;
    commitId: string;
  }) {
    const patch = await this.platform.fetchRawPatch({
      owner: params.owner,
      repo: params.repo,
      pullNo: params.pullNo,
      token: params.token,
    });
    const { filteredPatch, removedFiles } = filterReviewPatch(patch);
    const reviewPatch = removedFiles.length
      ? `${filteredPatch}\n\n[OMITTED FILE DIFFS: ${removedFiles.join(", ")}]`
      : filteredPatch;

    const response = await this.agent.invoke({
      messages: [
        {
          role: "user",
          content: this.reviewPrompt(reviewPatch),
        },
      ],
    });

    const raw = this.extractAgentContent(response);
    const review = this.parseReviewResult(
      raw,
      params.commitId,
      buildPatchLineIndex(filteredPatch),
    );

    for (const finding of review.findings) {
      await this.platform.createReviewComment({
        owner: params.owner,
        repo: params.repo,
        pullNo: params.pullNo,
        token: params.token,
        ...finding,
      });
    }

    const generalComment = this.buildGeneralComment(review);
    if (generalComment) {
      await this.platform.commentInPr({
        owner: params.owner,
        repo: params.repo,
        pullNo: params.pullNo,
        token: params.token,
        summary: generalComment,
      });
    }
  }

  private reviewPrompt(patch: string) {
    return `You are reviewing a GitHub pull request patch.
Return ONLY valid JSON with this shape:
{
  "summary": "Optional short top-level review summary",
  "findings": [
    {
      "body": "Markdown review body",
      "path": "file/path.ts",
      "line": 123,
      "side": "RIGHT"
    }
  ]
}

Notes:
- Each finding must include a non-empty "body".
- Use either "position" or "line"+"side", never both.
- If you need a multi-line comment, include both "startLine" and "startSide".
- If there are no actionable inline findings, return "findings": [] and put the explanation in "summary".
- Keep findings concise and high signal.

Patch:

${patch}`;
  }

  private parseReviewResult(
    raw: string,
    commitId: string,
    lineIndex: PatchLineIndex,
  ): ReviewResult {
    const json = this.extractJsonObject(raw);
    if (!json) {
      return this.fallbackReviewResult(raw);
    }

    try {
      const parsed = JSON.parse(json);
      return this.normalizeReviewResult(parsed, commitId, lineIndex);
    } catch {
      return this.fallbackReviewResult(raw);
    }
  }

  private normalizeReviewResult(
    input: unknown,
    commitId: string,
    lineIndex: PatchLineIndex,
  ): ReviewResult {
    const parsed =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};
    const findingsInput = Array.isArray(parsed.findings)
      ? parsed.findings
      : parsed.body
        ? [parsed]
        : [];

    const findings: ReviewFinding[] = [];
    const generalComments: string[] = [];

    for (const findingInput of findingsInput) {
      const finding = this.normalizeFinding(findingInput, commitId, lineIndex);
      if (finding.validFinding) {
        findings.push(finding.validFinding);
      } else if (finding.generalComment) {
        generalComments.push(finding.generalComment);
      }
    }

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : undefined;

    return { findings, summary, generalComments };
  }

  private normalizeFinding(
    input: unknown,
    commitId: string,
    lineIndex: PatchLineIndex,
  ): { validFinding?: ReviewFinding; generalComment?: string } {
    if (!input || typeof input !== "object") {
      return {};
    }

    const parsed = input as Record<string, unknown>;
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) {
      return {};
    }

    const path =
      typeof parsed.path === "string" && parsed.path.trim()
        ? parsed.path.trim()
        : "";
    const position = this.positiveInteger(parsed.position);
    const line = this.positiveInteger(parsed.line);
    const side = this.normalizeSide(parsed.side);
    const startLine = this.positiveInteger(parsed.startLine);
    const startSide = this.normalizeSide(parsed.startSide);

    if (!path) {
      return { generalComment: body };
    }

    const hasPosition = position !== undefined;
    const hasLineMode = line !== undefined && side !== undefined;

    if (hasPosition === hasLineMode) {
      return {
        generalComment: `${body}\n\nLocation could not be validated for \`${path}\`.`,
      };
    }

    if (hasPosition) {
      return {
        validFinding: {
          body,
          commitId,
          path,
          position,
        },
      };
    }

    if ((startLine === undefined) !== (startSide === undefined)) {
      return {
        generalComment: `${body}\n\nMulti-line location was incomplete for \`${path}\`.`,
      };
    }

    if (!line || !side || !lineIndex.has(path, side, line)) {
      return {
        generalComment: `${body}\n\nLine ${line} on ${path} (${side}) is not part of this diff.`,
      };
    }

    if (
      startLine !== undefined &&
      startSide !== undefined &&
      !lineIndex.has(path, startSide, startLine)
    ) {
      return {
        generalComment: `${body}\n\nStart line ${startLine} on ${path} (${startSide}) is not part of this diff.`,
      };
    }

    return {
      validFinding: {
        body,
        commitId,
        path,
        line,
        side,
        startLine,
        startSide,
      },
    };
  }

  private buildGeneralComment(review: ReviewResult): string | null {
    const parts: string[] = [];

    if (review.summary?.trim()) {
      parts.push(review.summary.trim());
    }

    if (review.generalComments?.length) {
      const formatted = review.generalComments.map(
        (comment) => `- ${comment.replace(/\n{2,}/g, "\n")}`,
      );
      parts.push(
        [
          "Additional findings that could not be placed inline:",
          ...formatted,
        ].join("\n"),
      );
    }

    if (parts.length === 0 && review.findings.length === 0) {
      return "No actionable issues found in this review.";
    }

    return parts.length ? parts.join("\n\n") : null;
  }

  private fallbackReviewResult(raw: string): ReviewResult {
    const summary = raw.trim();
    return {
      findings: [],
      summary: summary || "No actionable issues found in this review.",
    };
  }

  private positiveInteger(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value > 0
      ? value
      : undefined;
  }

  private normalizeSide(value: unknown): ReviewSide | undefined {
    if (typeof value !== "string") return undefined;
    const upper = value.toUpperCase();
    if (upper === "LEFT") return "LEFT";
    if (upper === "RIGHT") return "RIGHT";
    return undefined;
  }

  private extractAgentContent(response: unknown): string {
    const contentFromMessages = this.extractLastMessageContent(response);
    if (contentFromMessages) return contentFromMessages;

    const responseRecord =
      response && typeof response === "object"
        ? (response as Record<string, unknown>)
        : null;
    if (typeof responseRecord?.response === "string") {
      return responseRecord.response;
    }
    if (
      responseRecord?.response &&
      typeof responseRecord.response === "object" &&
      typeof (responseRecord.response as Record<string, unknown>).content ===
        "string"
    ) {
      const content = (responseRecord.response as Record<string, unknown>)
        .content;
      if (typeof content === "string") {
        return content;
      }
    }

    if (typeof responseRecord?.output === "string") {
      return responseRecord.output;
    }
    if (
      responseRecord?.output &&
      typeof responseRecord.output === "object" &&
      typeof (responseRecord.output as Record<string, unknown>).content ===
        "string"
    ) {
      const content = (responseRecord.output as Record<string, unknown>).content;
      if (typeof content === "string") {
        return content;
      }
    }

    return JSON.stringify(response);
  }

  private extractLastMessageContent(response: unknown): string | null {
    if (
      !response ||
      typeof response !== "object" ||
      !("messages" in response) ||
      !Array.isArray(response.messages) ||
      response.messages.length === 0
    ) {
      return null;
    }

    const last = response.messages[response.messages.length - 1];
    if (last && typeof last === "object" && "content" in last) {
      if (typeof last.content === "string") return last.content;
      if (Array.isArray(last.content)) {
        return last.content
          .map((part: unknown) =>
            part && typeof part === "object" && "text" in part && typeof part.text === "string"
              ? part.text
              : "",
          )
        .filter(Boolean)
        .join("\n");
      }
    }

    return null;
  }

  private extractJsonObject(raw: string): string | null {
    if (typeof raw !== "string") return null;

    const start = raw.indexOf("{");
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
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
}
