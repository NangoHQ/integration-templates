import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conversation-messages.js';

describe('highlevel list-conversation-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-conversation-messages',
        Model: 'ActionOutput_highlevel_listconversationmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
