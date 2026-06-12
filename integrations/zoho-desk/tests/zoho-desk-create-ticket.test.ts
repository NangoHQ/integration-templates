import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ticket.js';

describe('zoho-desk create-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ticket',
        Model: 'ActionOutput_zoho_desk_createticket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
