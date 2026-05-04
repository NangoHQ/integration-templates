import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/modify-message.js';

describe('google-mail modify-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'modify-message',
        Model: 'ActionOutput_google_mail_modifymessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
