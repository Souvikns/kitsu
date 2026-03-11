import { createDeepAgent } from "deepagents";
import { Platform, type CreateReviewCommentParams } from "./models/platform";

type ReviewSide = "RIGHT" | "LEFT";

export class Agent {
  private agent;
  constructor(
    model: any,
    private platform: Platform,
  ) {
    this.agent = createDeepAgent({
      model,
      systemPrompt: `You are an expert Software Engineer and Code Reviewer responsible for reviewing GitHub Pull Requests. Your goal is to help maintain high code quality, reliability, and maintainability in the repository.`,
      tools: [],
      subagents: [],
    });
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
      pullno: params.pullNo,
    });

    const fallbackLocation = this.pickReviewLocation(patch);

    const response = await this.agent.invoke({
      messages: [
        {
          role: "user",
          content: this.reviewPrompt(patch, fallbackLocation),
        },
      ],
    });

    const raw = this.extractAgentContent(response);
    const review = this.parseReviewCommentPayload(raw, fallbackLocation);

    await this.platform.createReviewComment({
      owner: params.owner,
      repo: params.repo,
      pullNo: params.pullNo,
      token: params.token,
      commitId: params.commitId,
      ...review,
    });
  }

  private reviewPrompt(
    patch: string,
    fallback: Partial<CreateReviewCommentParams> | null,
  ) {
    return `You are reviewing a GitHub pull request patch.
Return ONLY valid JSON with this shape (matching GitHub createReviewComment):
{
  "body": "Markdown review body",
  "path": "file/path.ts",
  "line": 123,
  "side": "RIGHT"
}

Notes:
- If you need a multi-line comment, include "startLine" and "startSide".
- If you use "position" instead, omit line/side.
- Keep the body concise: summary + bullet list of findings.
- If no issues, say so clearly.
- Prefer using this default location unless you have a better one from the patch:
${fallback ? JSON.stringify(fallback, null, 2) : "null"}

Patch:

${patch}`;
  }

  private parseReviewCommentPayload(
    raw: string,
    fallback: Partial<CreateReviewCommentParams> | null,
  ): Pick<
    CreateReviewCommentParams,
    "body" | "path" | "position" | "line" | "side" | "startLine" | "startSide"
  > {
    const json = this.extractJsonObject(raw);
    if (json) {
      try {
        const parsed = JSON.parse(json);
        const body =
          typeof parsed?.body === "string" ? parsed.body.trim() : "";
        const path =
          typeof parsed?.path === "string" && parsed.path.trim()
            ? parsed.path.trim()
            : fallback?.path;
        const position =
          typeof parsed?.position === "number" ? parsed.position : undefined;
        const line = typeof parsed?.line === "number" ? parsed.line : undefined;
        const side = this.normalizeSide(parsed?.side) ?? fallback?.side;
        const startLine =
          typeof parsed?.startLine === "number"
            ? parsed.startLine
            : undefined;
        const startSide = this.normalizeSide(parsed?.startSide);

        if (body && path && (position || (line && side))) {
          return {
            body,
            path,
            position,
            line,
            side,
            startLine,
            startSide,
          };
        }
      } catch {
        // fall through to raw parsing
      }
    }

    if (!fallback?.path || !(fallback?.position || (fallback?.line && fallback?.side))) {
      throw new Error("Unable to determine a review comment location.");
    }

    return {
      body: raw.trim(),
      path: fallback.path,
      position: fallback.position,
      line: fallback.line,
      side: fallback.side,
      startLine: fallback.startLine,
      startSide: fallback.startSide,
    };
  }

  private normalizeSide(value: unknown): ReviewSide | undefined {
    if (typeof value !== "string") return undefined;
    const upper = value.toUpperCase();
    if (upper === "LEFT") return "LEFT";
    if (upper === "RIGHT") return "RIGHT";
    return undefined;
  }

  private pickReviewLocation(
    patch: string,
  ): Partial<CreateReviewCommentParams> | null {
    if (!patch) return null;

    let currentPath: string | null = null;
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;

    let firstAdded: { path: string; line: number; side: ReviewSide } | null =
      null;
    let firstDeleted: { path: string; line: number; side: ReviewSide } | null =
      null;
    let firstContext: { path: string; line: number; side: ReviewSide } | null =
      null;

    const lines = patch.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git ")) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)\s*$/);
        currentPath = match?.[2] ?? null;
        inHunk = false;
        continue;
      }

      if (!currentPath) continue;

      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLine = Number(match[1]);
          newLine = Number(match[2]);
          inHunk = true;
        }
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith("+") && !line.startsWith("+++")) {
        if (!firstAdded) {
          firstAdded = { path: currentPath, line: newLine, side: "RIGHT" };
        }
        newLine += 1;
        continue;
      }

      if (line.startsWith("-") && !line.startsWith("---")) {
        if (!firstDeleted) {
          firstDeleted = { path: currentPath, line: oldLine, side: "LEFT" };
        }
        oldLine += 1;
        continue;
      }

      if (line.startsWith(" ")) {
        if (!firstContext) {
          firstContext = { path: currentPath, line: newLine, side: "RIGHT" };
        }
        oldLine += 1;
        newLine += 1;
        continue;
      }
    }

    return (
      firstAdded ??
      firstDeleted ??
      firstContext ?? {
        path: currentPath ?? undefined,
        line: newLine || undefined,
        side: "RIGHT",
      }
    );
  }

  private extractAgentContent(response: any): string {
    const contentFromMessages = this.extractLastMessageContent(
      response?.messages,
    );
    if (contentFromMessages) return contentFromMessages;

    if (typeof response?.response === "string") return response.response;
    if (typeof response?.response?.content === "string") {
      return response.response.content;
    }

    if (typeof response?.output === "string") return response.output;
    if (typeof response?.output?.content === "string") {
      return response.output.content;
    }

    return typeof response === "string" ? response : JSON.stringify(response);
  }

  private extractLastMessageContent(messages: any): string | null {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    const last = messages[messages.length - 1];
    if (typeof last?.content === "string") return last.content;
    if (Array.isArray(last?.content)) {
      return last.content
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n");
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
