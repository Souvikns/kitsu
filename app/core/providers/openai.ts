import { ChatOpenAI } from "@langchain/openai";
import { LLMProvider } from "../llm";

export class OpenAIProvider extends LLMProvider {
  private openai;

  constructor(apikey: string, model: string) {
    super();
    this.openai = new ChatOpenAI({
      apiKey: apikey,
      model: model,
    });
  }

  override async generateSummary(patch: string): Promise<string> {
    let prompt = this.summaryPrompt(patch);
    const llmResponse = await this.openai.invoke(prompt);

    return llmResponse.content as string;
  }
}
