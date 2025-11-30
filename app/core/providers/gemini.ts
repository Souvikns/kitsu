import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LLMProvider } from '../llm';


export class GeminiProvider extends LLMProvider {
    private gemini

    constructor(apikey: string, model: string) {
        super();
        this.gemini = new ChatGoogleGenerativeAI({
            apiKey: apikey,
            model: model
        })
    }

    override async generateSummary(patch: string): Promise<string> {
        let prompt = this.summaryPrompt(patch);
        const llmResponse = await this.gemini.invoke(prompt);

        return llmResponse.content as string;
    }
}