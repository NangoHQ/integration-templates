import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-member.js';

describe('trello get-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-member',
        Model: 'ActionOutput_trello_getmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
