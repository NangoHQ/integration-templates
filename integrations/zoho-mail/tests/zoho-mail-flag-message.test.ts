import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/flag-message.js';

describe('zoho-mail flag-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'flag-message',
        Model: 'ActionOutput_zoho_mail_flagmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
