import { Provider, type ProviderParams } from "../models/provider";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export class GeminiProvider extends Provider {
  private gemini;

  constructor(params: ProviderParams) {
    super();
    this.gemini = new ChatGoogleGenerativeAI({
      apiKey: params.apikey,
      model: params.model,
    });
  }

  override async generateSummary(patch: string): Promise<string> {
    let prompt = this.summaryPrompt(patch);
    const llmResponse = await this.gemini.invoke(prompt);

    return llmResponse.content as string;
  }
}
