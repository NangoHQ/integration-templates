import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-purchase-order.js';

describe('quickbooks get-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-purchase-order',
        Model: 'ActionOutput_quickbooks_sandbox_getpurchaseorder'
    });

    beforeEach(() => {
        nangoMock.getConnection.mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
