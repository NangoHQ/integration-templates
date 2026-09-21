import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-tweets.js';

describe('twitter-v2 search-tweets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-tweets',
        Model: 'ActionOutput_twitterv2_searchtweets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
