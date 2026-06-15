import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/forward-email.js';

describe('zoho-mail forward-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'forward-email',
        Model: 'ActionOutput_zoho_mail_forwardemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
