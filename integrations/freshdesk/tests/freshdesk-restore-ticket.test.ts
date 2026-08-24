import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-ticket.js';

describe('freshdesk restore-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-ticket',
        Model: 'ActionOutput_freshdesk_restoreticket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
