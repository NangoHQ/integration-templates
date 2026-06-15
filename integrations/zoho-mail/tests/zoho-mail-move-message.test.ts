import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-message.js';

describe('zoho-mail move-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-message',
        Model: 'ActionOutput_zoho_mail_movemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
