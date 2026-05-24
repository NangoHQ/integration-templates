import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-people.js';

describe('apollo search-people tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-people',
        Model: 'ActionOutput_apollo_oauth_searchpeople'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
