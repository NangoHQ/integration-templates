import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-conversation-message.js';

describe('twilio delete-conversation-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-conversation-message',
        Model: 'ActionOutput_twilio_deleteconversationmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
