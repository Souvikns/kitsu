import GeminiProvider from "../gemini";

describe('Gemini Provider', () => {
    it('Should load API KEY', () => {
        expect(process.env.GEMINI_API_KEY).toBeDefined();
    })

    it('should load MODEL', () => {
        expect(process.env.GEMINI_MODEL).toBeDefined();
    })

    it('should be able to initialize the provider object', () => {
        let gemini = new GeminiProvider(process.env.GEMINI_API_KEY || '', process.env.GEMINI_MODEL || '')
        expect(gemini).toBeDefined();
    })
})