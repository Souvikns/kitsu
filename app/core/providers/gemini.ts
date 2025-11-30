import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { type LLMProvider } from '../llm';


class GeminiProvider implements LLMProvider {
    private gemini

    constructor(apikey: string, model: string) {
        this.gemini = new ChatGoogleGenerativeAI({
            apiKey: apikey,
            model: model
        })
    }

    async generateSummary(prompt: Array<any>): Promise<string> {
        const llmResponse = await this.gemini.invoke(prompt);

        return llmResponse.content as string;
    }

    static summaryPrompt(patch: string) {
        let system = {
            role: 'system',
            content: `You are an expert software engineer who specializes in reading GitHub pull request patches.
Your job is to analyze a given patch file and produce a clear, concise, and technically accurate summary.
You must understand file-level changes, code modifications, additions, deletions, and overall intent.
`
        }
        let user = {
            role: 'human',
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
`
        }
        return [system, user];
    }
}

export default GeminiProvider;