import { Provider, type ProviderParams } from "../models/provider";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export class GeminiProvider extends Provider {
  private gemini;

  constructor(params: ProviderParams) {
    super();
    if (!params.apikey) {
      throw new Error("Gemini API key is required.");
    }
    if (!params.model) {
      throw new Error("Gemini model is required.");
    }
    this.gemini = new ChatGoogleGenerativeAI({
      apiKey: params.apikey,
      model: params.model,
    });
  }

  protected override async invokeModel(prompt: Array<any>): Promise<string> {
    const llmResponse = await this.gemini.invoke(prompt);
    return llmResponse.content as string;
  }
}
