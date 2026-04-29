import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-draft.js';

describe('google-mail send-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-draft',
        Model: 'ActionOutput_google_mail_senddraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
