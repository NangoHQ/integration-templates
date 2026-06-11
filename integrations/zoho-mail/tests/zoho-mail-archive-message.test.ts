import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-message.js';

describe('zoho-mail archive-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'archive-message',
        Model: 'ActionOutput_zoho_mail_archivemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
