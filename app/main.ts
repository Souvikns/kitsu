import * as github from "@actions/github";
import * as core from "@actions/core";
import { Kitsu } from "./kitsu";
import { GithubPlatform } from "./github";
import { GeminiProvider, OpenAIProvider } from "./providers";
import { type ProviderParams } from "./models/provider";

function getInputs() {
  const { owner, repo } = github.context.repo;
  const prNumber = github.context.payload.pull_request?.number;

  if (!prNumber) {
    throw new Error(
      "No pull request context found. This action must be run on pull_request events"
    );
  }

  let provider = core.getInput("provider");
  let apiKey = core.getInput("api_key");
  let model = core.getInput("model");

  return {
    owner,
    repo,
    prNumber,
    provider,
    apiKey,
    model,
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

const main = async () => {
  const inputs = getInputs();
  let kitsu = new Kitsu(
    getProvider(inputs.provider, {
      apikey: inputs.apiKey,
      model: inputs.model,
    }),
    new GithubPlatform()
  );
  let { makeComment, summary } = await kitsu.generatePatchSummary({
    owner: inputs.owner,
    pullno: inputs.prNumber,
    repo: inputs.repo,
  });

  makeComment({
    owner: inputs.owner,
    pullNo: inputs.prNumber,
    repo: inputs.repo,
    token: process.env.GITHUB_TOKEN || "",
    summary: summary,
  });
};

main().catch((e) => console.error(e));
