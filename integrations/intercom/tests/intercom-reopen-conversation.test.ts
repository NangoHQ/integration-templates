import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reopen-conversation.js';

describe('intercom reopen-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reopen-conversation',
        Model: 'ActionOutput_intercom_reopenconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
