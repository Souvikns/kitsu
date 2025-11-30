import { ChatOpenAI } from '@langchain/openai';
import { LLMProvider } from '../llm';

class OpenAIProvider extends LLMProvider {
    private openai

    constructor(apikey: string, model: string) {
        super();
        this.openai = new ChatOpenAI({
            apiKey: apikey,
            model: model,
        })
    }

    override async generateSummary(prompt: Array<any>): Promise<string> {
        const llmResponse = await this.openai.invoke(prompt)

        return llmResponse.content as string;
    }
}

export default OpenAIProvider;
