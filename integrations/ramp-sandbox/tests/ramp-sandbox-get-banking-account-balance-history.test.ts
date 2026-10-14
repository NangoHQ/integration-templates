import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-banking-account-balance-history.js';

describe('ramp-sandbox get-banking-account-balance-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-banking-account-balance-history',
        Model: 'ActionOutput_ramp_sandbox_getbankingaccountbalancehistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
