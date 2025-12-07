<h1 align="center">Kitsu</h1>
<p align="center">
<img src="./assets/kitsu.svg" height=200 width=200 align=center />
</p>
<p align="center">
Kitsu is your friendly open-source co-maintainer — reviewing PRs, summarizing changes, and auto-triaging issues to keep your projects healthy and organized.
</p>

## Table of Contents

- [Setup Guide](#setup-guide)
  - [Setting up GitHub Workflow](#setting-up-github-workflow)
  - [Adding `env` Variables](#adding-env-variables)
- [Reporting Issues](#reporting-issues)
- [Contributing](#contributing)
  - [Contributing Guide](#contributing-guide)
    - [Getting Started Quick](#getting-started-quick)
- [Community Support](#community-support)

## Setup Guide

To use Kitsu in all it's glory you need to write a GitHub workflow and with your own API Keys.

### Setting up GitHub Workflow

Create a file `kitsu.yml` in the folder `.github/workflows` and add these lines

```yaml
name: Kitsu AI Maintainer

on:
  pull_request:
    types: [opened]

jobs:
  run-kitsu:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Use Kitsu Action
        uses: your-org/kitsu@v1
        with:
          provider: openai
          api_key: ${{ secrets.KITSU_API_KEY }}
          model: gpt-4o-mini
```

### Adding `env` variables

You need to setup some `env` variables for the workflow to run.

| variable name | description                         | Required |
| ------------- | ----------------------------------- | -------- |
| provider      | `openai` or `gemini`                | `true`   |
| api_key       | api key of your respective service  | `true`   |
| model         | model name you want to kitsu to use | `true`   |

## Reporting Issues

Currently `Kitsu` is under development and it will have a lot of bugs, that we will be fixing as they come up. Feel free to let us know if you encounter any bug, it would help get the tool better. To report a bug just open a [issue](https://github.com/Souvikns/kitsu/issues) describing the bug.

## Contributing

Please take a moment to read our [contributing guide](#contributing-guide) to learn about our development process. It woud be adviced to open a [issues](https://github.com/Souvikns/kitsu/issues) first to discuss potential changes/additions.

### Contributing Guide

This project is built using [bun](https://bun.sh/) and [nodejs](https://nodejs.org) so go head and get those for your respective system.

#### Getting Started Quick

In order to contribute to this project, you should:

1. Clone this repository from your fork
2. Run `npm install` in the project directory to install all the requried dependencies. (You have to have npm on your system, if you have nodejs you most probably have npm installed as well)
3. Create a new branch with a meaningful name.
4. Develop a new feature or fix a bug you want.
5. Open a pull request to the `main` branch

- Remember to build and package the code before you commit run -
  - `npm run build`
  - `npm run package`

## Community Support

Currently [I](https://github.com/Souvikns/) am the sole maintainer of the project, you can star this project to follow it's development. Feel free to open issues for any new feature that you want, and I will try to build it. Feel free to fork the project and build the feature for yourself if I am too slow.
