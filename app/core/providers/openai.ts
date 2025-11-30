import { ChatOpenAI } from '@langchain/openai';
import { type LLMProvider } from '../llm';

class OpenAIProvider implements LLMProvider {
    private openai

    constructor(private apikey: string, private model: string) {
        this.openai = new ChatOpenAI({
            apiKey: apikey,
            model: model,
        })
    }

    generateSummary(prompt: Array<any>): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export default OpenAIProvider;
