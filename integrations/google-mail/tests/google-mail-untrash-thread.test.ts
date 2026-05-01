import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/untrash-thread.js';

describe('google-mail untrash-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'untrash-thread',
        Model: 'ActionOutput_google_mail_untrashthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
