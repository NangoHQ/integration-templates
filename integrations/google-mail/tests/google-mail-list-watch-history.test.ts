import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-watch-history.js';

describe('google-mail list-watch-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-watch-history',
        Model: 'ActionOutput_google_mail_listwatchhistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
