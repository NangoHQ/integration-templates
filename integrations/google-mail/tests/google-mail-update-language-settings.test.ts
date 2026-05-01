import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-language-settings.js';

describe('google-mail update-language-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-language-settings',
        Model: 'ActionOutput_google_mail_updatelanguagesettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
