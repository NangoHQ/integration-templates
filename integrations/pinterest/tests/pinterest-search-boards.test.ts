import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-boards.js';

describe('pinterest search-boards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-boards',
        Model: 'ActionOutput_pinterest_searchboards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
