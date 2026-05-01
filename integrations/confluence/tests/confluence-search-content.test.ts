import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-content.js';

describe('confluence search-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-content',
        Model: 'ActionOutput_confluence_searchcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
