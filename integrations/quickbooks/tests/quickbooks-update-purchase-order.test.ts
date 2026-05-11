import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-purchase-order.js';

describe('quickbooks update-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-purchase-order',
        Model: 'ActionOutput_quickbooks_sandbox_updatepurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to return realmId from the test environment
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
