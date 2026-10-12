import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-purchase-order.js';

describe('zoho-inventory cancel-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-purchase-order',
        Model: 'ActionOutput_zoho_inventory_cancelpurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
