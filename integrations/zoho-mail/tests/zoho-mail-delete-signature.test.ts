import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-signature.js';

describe('zoho-mail delete-signature tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-signature',
        Model: 'ActionOutput_zoho_mail_deletesignature'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
