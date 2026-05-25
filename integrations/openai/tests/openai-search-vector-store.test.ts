import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-vector-store.js';

describe('openai search-vector-store tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-vector-store',
        Model: 'ActionOutput_openai_searchvectorstore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
