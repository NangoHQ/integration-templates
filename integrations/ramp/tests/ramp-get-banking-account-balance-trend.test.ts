import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-banking-account-balance-trend.js';

describe('ramp get-banking-account-balance-trend tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-banking-account-balance-trend',
        Model: 'ActionOutput_ramp_getbankingaccountbalancetrend'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
