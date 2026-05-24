import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-organizations.js';

describe('apollo search-organizations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-organizations',
        Model: 'ActionOutput_apollo_oauth_searchorganizations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
