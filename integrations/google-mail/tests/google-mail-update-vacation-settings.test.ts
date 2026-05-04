import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-vacation-settings.js';

describe('google-mail update-vacation-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-vacation-settings',
        Model: 'ActionOutput_google_mail_updatevacationsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
