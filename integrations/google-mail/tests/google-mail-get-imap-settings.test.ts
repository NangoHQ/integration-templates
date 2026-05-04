import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-imap-settings.js';

describe('google-mail get-imap-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-imap-settings',
        Model: 'ActionOutput_google_mail_getimapsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
