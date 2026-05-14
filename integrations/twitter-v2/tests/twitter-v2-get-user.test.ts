import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user.js';

describe('twitter-v2 get-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user',
        Model: 'ActionOutput_twitter_v2_getuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
