import * as github from "@actions/github";
import * as core from "@actions/core";
import {
  fetchRawPatch,
  makeComment,
  initializeProvider,
} from "./app/github/utils";

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

async function main() {
  const inputs = getInputs();
  let rawPatch = await fetchRawPatch(
    inputs.owner,
    inputs.repo,
    inputs.prNumber
  );
  let llm = initializeProvider(inputs.provider, inputs.apiKey, inputs.model);

  let summary = await llm?.generateSummary(rawPatch as string);
  if (!summary) {
    throw new Error("Unable to generate summary something is not right!!");
  }

  makeComment({
    owner: inputs.owner,
    repo: inputs.repo,
    pullNo: inputs.prNumber,
    summary,
    token: process.env.GITHUB_TOKEN || "",
  });
}

main().catch((e) => console.error(e));
