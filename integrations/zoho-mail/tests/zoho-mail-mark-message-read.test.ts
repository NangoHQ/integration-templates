import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-message-read.js';

describe('zoho-mail mark-message-read tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-message-read',
        Model: 'ActionOutput_zoho_mail_markmessageread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
