import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/create-ticket.js';

describe('zendesk create-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ticket',
        Model: 'CreatedTicket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
