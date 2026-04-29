import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-drafts.js';

describe('google-mail list-drafts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-drafts',
        Model: 'ActionOutput_google_mail_listdrafts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
