import * as core from "@actions/core";
import * as github from "@actions/github";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { Agent } from "./agent";
import { GithubPlatform } from "./github";
import type { Platform } from "./models/platform";
import { type ProviderParams } from "./models/provider";

type ActionInputs = {
  owner: string;
  repo: string;
  prNumber: number;
  commitId: string;
  provider: string;
  apiKey: string;
  model: string;
  githubToken: string;
};

type InputDeps = {
  context?: typeof github.context;
  coreModule?: Pick<typeof core, "getInput">;
  env?: NodeJS.ProcessEnv;
};

export function getInputs(deps: InputDeps = {}): ActionInputs {
  const context = deps.context ?? github.context;
  const coreModule = deps.coreModule ?? core;
  const env = deps.env ?? process.env;
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request?.number;
  const commitId = context.payload.pull_request?.head?.sha;

  if (!prNumber) {
    throw new Error(
      "No pull request context found. This action must be run on pull_request events",
    );
  }
  if (!commitId) {
    throw new Error("No pull request commit SHA found in event payload");
  }

  return {
    owner,
    repo,
    prNumber,
    commitId,
    provider: coreModule.getInput("provider"),
    apiKey: coreModule.getInput("api_key"),
    model: coreModule.getInput("model"),
    githubToken: coreModule.getInput("github_token") || env.GITHUB_TOKEN || "",
  };
}

export const getAgentModel = (provider: string, params: ProviderParams) => {
  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        apiKey: params.apikey,
        model: params.model,
      });
    case "gemini":
      return new ChatGoogleGenerativeAI({
        apiKey: params.apikey,
        model: params.model,
      });
    default:
      throw new Error("Invalid LLM Provider unable to initialize application");
  }
};

type MainDeps = InputDeps & {
  platform?: Platform;
  agentFactory?: (inputs: ActionInputs, platform: Platform) => Agent;
};

export async function main(deps: MainDeps = {}) {
  const inputs = getInputs(deps);
  const platform = deps.platform ?? new GithubPlatform();
  const agent =
    deps.agentFactory?.(inputs, platform) ??
    new Agent(
      getAgentModel(inputs.provider, {
        apikey: inputs.apiKey,
        model: inputs.model,
      }),
      platform,
    );

  await agent.run({
    owner: inputs.owner,
    repo: inputs.repo,
    pullNo: inputs.prNumber,
    token: inputs.githubToken,
    commitId: inputs.commitId,
  });
}

if (!process.env.JEST_WORKER_ID) {
  main().catch((error) => console.error(error));
}
