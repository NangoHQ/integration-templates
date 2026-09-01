import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-message-board.js';

describe('basecamp get-message-board tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-message-board',
        Model: 'ActionOutput_basecamp_getmessageboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
