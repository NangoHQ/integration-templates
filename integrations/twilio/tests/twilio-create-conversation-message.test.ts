import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-conversation-message.js';

describe('twilio create-conversation-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-conversation-message',
        Model: 'ActionOutput_twilio_createconversationmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
