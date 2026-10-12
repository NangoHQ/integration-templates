import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sales-order-fulfillment-status.js';

describe('zoho-inventory get-sales-order-fulfillment-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sales-order-fulfillment-status',
        Model: 'ActionOutput_zoho_inventory_getsalesorderfulfillmentstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
