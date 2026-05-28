import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-index.js';

describe('algolia search-index tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-index',
        Model: 'ActionOutput_algolia_searchindex'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
