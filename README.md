<h1 align="center">Kitsu</h1>
<p align="center">
<img src="./assets/kitsu.svg" height=200 width=200 align=center />
</p>
<p align="center">
Kitsu is your open-source AI PR reviewer for GitHub. It reads a pull request patch, posts inline review comments for actionable findings, and falls back to a general PR comment when a finding cannot be placed safely in the diff.
</p>

## Table of Contents

- [Setup Guide](#setup-guide)
  - [Setting up GitHub Workflow](#setting-up-github-workflow)
  - [Adding `env` Variables](#adding-env-variables)
- [Reporting Issues](#reporting-issues)
- [Contributing](#contributing)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
  - [Running Tests](#running-tests)
  - [Submitting Changes](#submitting-changes)
- [Community Support](#community-support)

## Setup Guide

To use Kitsu you only need a GitHub repository where you want the action to run and an API key for your preferred AI provider. The steps below will add a minimal workflow you can tweak later.

### Setting up GitHub Workflow

1. Create a repository secret named `KITSU_API_KEY` that stores your provider API key.
2. Create a file `.github/workflows/kitsu.yml` and add the workflow below. Update the `uses` version to a published tag when one is available.

```yaml
name: Kitsu AI Maintainer

on:
  pull_request:
    types: [opened]

jobs:
  run-kitsu:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Use Kitsu Action
        uses: Souvikns/kitsu@main
        with:
          provider: openai
          api_key: ${{ secrets.KITSU_API_KEY }}
          model: gpt-4o-mini
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

3. Commit the workflow to the branch where you want Kitsu to run. The action currently triggers on `pull_request` events and posts review feedback against the PR head commit.

Notes:

- Set `provider` to either `openai` or `gemini` depending on which key you have available.
- `model` defaults to `gpt-4o-mini` for OpenAI. Choose a compatible model name for the provider you select.
- `github_token` is required to post inline review comments and fallback PR comments. Use `${{ secrets.GITHUB_TOKEN }}` or a PAT with `pull-requests: write`.
- Large lockfiles, binaries, and oversized generated diffs are omitted from the model prompt so review context is spent on code changes.

### Adding `env` variables

You need to setup some `env` variables for the workflow to run.

| variable name | description                         | Required |
| ------------- | ----------------------------------- | -------- |
| provider      | `openai` or `gemini`                | `true`   |
| api_key       | API key of your respective service  | `true`   |
| model         | Model name you want Kitsu to use    | `true`   |
| github_token  | GitHub token to comment on PRs      | `true`   |

## Reporting Issues

Currently `Kitsu` is under development and it will have bugs. To report one, open an [issue](https://github.com/Souvikns/kitsu/issues) with the workflow configuration, provider, model, and a minimal PR example if possible.

## Contributing

Please take a moment to read our contributing guide to learn about our development process. It would be advised to open an [issue](https://github.com/Souvikns/kitsu/issues) first to discuss potential changes/additions.

### Prerequisites

- [bun](https://bun.sh/) for dependency installation and running scripts
- [Node.js](https://nodejs.org) v18 or newer
- [git](https://git-scm.com/) for version control

### Local Setup

1. Fork this repository and clone your fork locally.
2. Install dependencies with `bun install` in the project directory.
3. Create a new branch with a meaningful name for your change.

### Running Tests

- Use `bun run test` to execute the Jest suite. Ensure tests pass before opening a pull request.

### Submitting Changes

1. Commit your work following conventional commit messages where possible.
2. Push your branch and open a pull request against the `main` branch.
3. Provide a clear description of the change and any steps to verify it.

## Community Support

Currently [I](https://github.com/Souvikns/) am the sole maintainer of the project, you can star this project to follow it's development. Feel free to open issues for any new feature that you want, and I will try to build it. Feel free to fork the project and build the feature for yourself if I am too slow.
