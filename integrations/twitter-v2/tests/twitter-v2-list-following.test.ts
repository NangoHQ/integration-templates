import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-following.js';

describe('twitter-v2 list-following tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-following',
        Model: 'ActionOutput_twitterv2_listfollowing'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
