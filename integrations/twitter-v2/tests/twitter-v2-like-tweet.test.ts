import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/like-tweet.js';

describe('twitter-v2 like-tweet tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'like-tweet',
        Model: 'ActionOutput_twitter_v2_liketweet'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
