import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-thread.js';

describe('google-mail delete-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-thread',
        Model: 'ActionOutput_google_mail_deletethread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
