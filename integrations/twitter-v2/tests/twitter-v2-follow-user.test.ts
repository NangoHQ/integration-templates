import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/follow-user.js';

describe('twitter-v2 follow-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'follow-user',
        Model: 'ActionOutput_twitter_v2_followuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
