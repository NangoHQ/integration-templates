import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-delete-messages.js';

describe('google-mail batch-delete-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-delete-messages',
        Model: 'ActionOutput_google_mail_batchdeletemessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
