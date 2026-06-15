import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-ticket-reply.js';

describe('zoho-desk send-ticket-reply tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-ticket-reply',
        Model: 'ActionOutput_zoho_desk_sendticketreply'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
