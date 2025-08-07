import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/search-tickets.js';

describe('zendesk search-tickets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-tickets',
        Model: 'SearchTicketOutput'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
