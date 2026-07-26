import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-message-content.js';

describe('mandrill get-message-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-message-content',
        Model: 'ActionOutput_mandrill_getmessagecontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
