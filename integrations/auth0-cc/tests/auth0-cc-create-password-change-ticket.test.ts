import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-password-change-ticket.js';

describe('auth0-cc create-password-change-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-password-change-ticket',
        Model: 'ActionOutput_auth0_cc_createpasswordchangeticket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
