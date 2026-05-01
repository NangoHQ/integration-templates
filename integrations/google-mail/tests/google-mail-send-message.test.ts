import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-message.js';

describe('google-mail send-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-message',
        Model: 'ActionOutput_google_mail_sendmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
