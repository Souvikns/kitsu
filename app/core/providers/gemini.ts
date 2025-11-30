import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LLMProvider } from '../llm';


class GeminiProvider extends LLMProvider {
    private gemini

    constructor(apikey: string, model: string) {
        super();
        this.gemini = new ChatGoogleGenerativeAI({
            apiKey: apikey,
            model: model
        })
    }

    override async generateSummary(prompt: Array<any>): Promise<string> {
        const llmResponse = await this.gemini.invoke(prompt);

        return llmResponse.content as string;
    }
}

export default GeminiProvider;