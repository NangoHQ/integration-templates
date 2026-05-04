import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-draft.js';

describe('google-mail delete-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-draft',
        Model: 'ActionOutput_google_mail_deletedraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
