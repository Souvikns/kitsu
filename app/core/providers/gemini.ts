import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { type LLMProvider } from '../llm';

class GeminiProvider implements LLMProvider {
    private gemini

    constructor(private apikey: string, private model: string) {
        this.gemini = new ChatGoogleGenerativeAI({
            apiKey: apikey,
            model: model
        })
    }

    generateSummary(diff: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export default GeminiProvider;