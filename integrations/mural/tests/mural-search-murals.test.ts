import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-murals.js';

describe('mural search-murals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-murals',
        Model: 'ActionOutput_mural_searchmurals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
