import {fetchRawPatch} from '../utils';

describe('GitHub utils ', () => {
    it('Should fetch pr patch', async () => {
        let patch = await fetchRawPatch('asyncapi', 'cli', '1828');
        expect(patch).toBeDefined()
    }, 30000)
})