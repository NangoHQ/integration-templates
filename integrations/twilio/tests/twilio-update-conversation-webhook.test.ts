import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-conversation-webhook.js';

describe('twilio update-conversation-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-conversation-webhook',
        Model: 'ActionOutput_twilio_updateconversationwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
