import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-pop-settings.js';

describe('google-mail get-pop-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-pop-settings',
        Model: 'ActionOutput_google_mail_getpopsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
