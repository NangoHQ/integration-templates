import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conversation-webhooks.js';

describe('twilio list-conversation-webhooks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-conversation-webhooks',
        Model: 'ActionOutput_twilio_listconversationwebhooks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
