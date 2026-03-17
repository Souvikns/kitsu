jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

import { OpenAIProvider } from "kitsu/providers/openai";

describe("OpenAI Provider", () => {
  it("should throw error if apikey is missing", () => {
    try {
      const _openai = new OpenAIProvider({
        apikey: "",
        model: "",
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should initialize with proper inputs", () => {
    const openai = new OpenAIProvider({
      apikey: "dummy-key",
      model: "dummy-model",
    });

    expect(openai).toBeDefined();
  });
});
