import * as github from "@actions/github";
import * as core from "@actions/core";
import { Kitsu } from "./kitsu";
import { GithubPlatform } from "./github";
import { GeminiProvider, OpenAIProvider } from "./providers";
import { type ProviderParams } from "./models/provider";
import { Agent } from "./agent";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

function getInputs() {
  const { owner, repo } = github.context.repo;
  const prNumber = github.context.payload.pull_request?.number;
  const commitId = github.context.payload.pull_request?.head?.sha;

  if (!prNumber) {
    throw new Error(
      "No pull request context found. This action must be run on pull_request events"
    );
  }
  if (!commitId) {
    throw new Error("No pull request commit SHA found in event payload");
  }

  let provider = core.getInput("provider");
  let apiKey = core.getInput("api_key");
  let model = core.getInput("model");
  let githubToken = core.getInput("github_token") || process.env.GITHUB_TOKEN;

  return {
    owner,
    repo,
    prNumber,
    commitId,
    provider,
    apiKey,
    model,
    githubToken,
  };
}

const getProvider = (provider: string, params: ProviderParams) => {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(params);
    case "gemini":
      return new GeminiProvider(params);
    default:
      throw new Error("Invalid LLM Provider unable to initialize application");
  }
};

const getAgentModel = (provider: string, params: ProviderParams) => {
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

const main = async () => {
  const inputs = getInputs();
  let kitsu = new Kitsu(
    getProvider(inputs.provider, {
      apikey: inputs.apiKey,
      model: inputs.model,
    }),
    new GithubPlatform()
  );

  const agent = new Agent(
    getAgentModel(inputs.provider, {
      apikey: inputs.apiKey,
      model: inputs.model,
    }),
    new GithubPlatform(),
  );

  await agent.run({
    owner: inputs.owner,
    repo: inputs.repo,
    pullNo: inputs.prNumber,
    token: inputs.githubToken || "",
    commitId: inputs.commitId,
  });
};

main().catch((e) => console.error(e));
