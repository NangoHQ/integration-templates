import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-contact-invite.js';

describe('freshdesk send-contact-invite tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-contact-invite',
        Model: 'ActionOutput_freshdesk_sendcontactinvite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
