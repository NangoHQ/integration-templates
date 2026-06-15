import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-email.js';

describe('zoho-mail send-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-email',
        Model: 'ActionOutput_zoho_mail_sendemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
