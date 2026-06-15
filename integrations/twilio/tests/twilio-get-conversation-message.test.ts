import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-conversation-message.js';

describe('twilio get-conversation-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-conversation-message',
        Model: 'ActionOutput_twilio_getconversationmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
