import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-payment.js';

describe('quickbooks get-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-payment',
        Model: 'ActionOutput_quickbooks_sandbox_getpayment'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: {
                realmId: '9341457021722202'
            }
        }));
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
