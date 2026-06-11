import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-draft.js';

describe('zoho-mail create-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-draft',
        Model: 'ActionOutput_zoho_mail_createdraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
