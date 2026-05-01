import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-vacation-settings.js';

describe('google-mail get-vacation-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-vacation-settings',
        Model: 'ActionOutput_google_mail_getvacationsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
