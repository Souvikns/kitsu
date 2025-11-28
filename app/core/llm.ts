
export interface LLMProvider {
    generateSummary(diff: string): Promise<string>
}
