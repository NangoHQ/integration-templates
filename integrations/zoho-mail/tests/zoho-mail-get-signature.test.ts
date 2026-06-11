import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-signature.js';

describe('zoho-mail get-signature tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-signature',
        Model: 'ActionOutput_zoho_mail_getsignature'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
