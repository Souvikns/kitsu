import * as github from '@actions/github';
import * as core from '@actions/core';

function getInputs() {
    const {owner, repo} = github.context.repo;
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
        throw new Error('No pull request context found. This action must be run on pull_request events');
    }

    let provider = core.getInput('provider');
    let apiKey = core.getInput('api_key');
    let model = core.getInput('model');

    return {
        owner,
        repo, 
        prNumber,
        provider,
        apiKey,
        model
    }
}

async function main() {
    const inputs =  getInputs();
}

main().catch(e => console.error(e));