import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-message.js';

describe('google-mail get-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-message',
        Model: 'ActionOutput_google_mail_getmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
