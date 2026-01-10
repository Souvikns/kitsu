import { Provider, type ProviderParams } from "../models/provider";
import { ChatOpenAI } from "@langchain/openai";

export class OpenAIProvider extends Provider {
  private openai;

  constructor(params: ProviderParams) {
    super();
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
