import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-payment.js';

describe('quickbooks update-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-payment',
        Model: 'ActionOutput_quickbooks_sandbox_updatepayment'
    });
    nangoMock.getConnection = vi.fn().mockResolvedValue({
        connection_config: {
            realmId: '9341457021722202'
        },
        metadata: {}
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
