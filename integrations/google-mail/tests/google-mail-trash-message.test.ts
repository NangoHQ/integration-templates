import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/trash-message.js';

describe('google-mail trash-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'trash-message',
        Model: 'ActionOutput_google_mail_trashmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
