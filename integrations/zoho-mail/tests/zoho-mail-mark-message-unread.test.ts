import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-message-unread.js';

describe('zoho-mail mark-message-unread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-message-unread',
        Model: 'ActionOutput_zoho_mail_markmessageunread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
