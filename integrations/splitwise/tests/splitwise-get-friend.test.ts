import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-friend.js';

describe('splitwise get-friend tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-friend',
        Model: 'ActionOutput_splitwise_getfriend'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
