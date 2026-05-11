import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/create-payment.js';

describe('quickbooks create-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-payment',
        Model: 'ActionOutput_quickbooks_sandbox_createpayment'
    });

    beforeEach(() => {
        // @allowMockSetup: Mock the connection with realmId for QuickBooks
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        } as any);
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
