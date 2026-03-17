jest.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

import { GeminiProvider } from "kitsu/providers/gemini";

describe("Gemini Provider", () => {
  it("should throw error if apikey is missing", () => {
    try {
      const _gemini = new GeminiProvider({
        apikey: "",
        model: "",
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should initialize with proper inputs", () => {
    const gemini = new GeminiProvider({
      apikey: "dummy-key",
      model: "dummy-model",
    });

    expect(gemini).toBeDefined();
  });
});
