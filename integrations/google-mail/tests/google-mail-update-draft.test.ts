import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-draft.js';

describe('google-mail update-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-draft',
        Model: 'ActionOutput_google_mail_updatedraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
