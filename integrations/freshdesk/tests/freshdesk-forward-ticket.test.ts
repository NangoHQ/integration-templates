import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/forward-ticket.js';

describe('freshdesk forward-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'forward-ticket',
        Model: 'ActionOutput_freshdesk_forwardticket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
