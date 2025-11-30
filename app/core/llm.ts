
export interface LLMProvider {
    generateSummary(prompt: Array<any>): Promise<string>
}
