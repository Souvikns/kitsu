import GeminiProvider from "../gemini";
import {fetchRawPatch} from '../../../github/utils';

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

    it('should generate summary', async () => {
        let gemini = new GeminiProvider(process.env.GEMINI_API_KEY || '', process.env.GEMINI_MODEL || '');
        let diff = await fetchRawPatch('asyncapi', 'cli', '1828')
        if (!diff) {
            throw new Error('unable to fetch diff');
        }

        let summary = await gemini.generateSummary(GeminiProvider.summaryPrompt(diff))
        expect(summary).toBeDefined();

    }, 50000)
})