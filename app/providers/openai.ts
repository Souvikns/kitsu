import { Provider, type ProviderParams } from "../models/provider";
import { ChatOpenAI } from "@langchain/openai";

export class OpenAIProvider extends Provider {
  private openai;

  constructor(params: ProviderParams) {
    super();
    if (!params.apikey) {
      throw new Error("OpenAI API key is required.");
    }
    if (!params.model) {
      throw new Error("OpenAI model is required.");
    }
    this.openai = new ChatOpenAI({
      apiKey: params.apikey,
      model: params.model,
    });
  }

  protected override async invokeModel(prompt: Array<any>): Promise<string> {
    const llmResponse = await this.openai.invoke(prompt);
    return llmResponse.content as string;
  }
}
