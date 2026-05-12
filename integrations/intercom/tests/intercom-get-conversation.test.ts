import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-conversation.js';

describe('intercom get-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-conversation',
        Model: 'ActionOutput_intercom_getconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
