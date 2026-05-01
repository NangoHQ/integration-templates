import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-auto-forwarding-settings.js';

describe('google-mail get-auto-forwarding-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-auto-forwarding-settings',
        Model: 'ActionOutput_google_mail_getautoforwardingsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
