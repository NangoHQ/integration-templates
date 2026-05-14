import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-liked-tweets.js';

describe('twitter-v2 list-liked-tweets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-liked-tweets',
        Model: 'ActionOutput_twitter_v2_listlikedtweets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
