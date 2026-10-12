import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-purchase-order.js';

describe('zoho-inventory get-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-purchase-order',
        Model: 'ActionOutput_zoho_inventory_getpurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
