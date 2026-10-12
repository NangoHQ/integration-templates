import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-purchase-order-issued.js';

describe('zoho-inventory mark-purchase-order-issued tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-purchase-order-issued',
        Model: 'ActionOutput_zoho_inventory_markpurchaseorderissued'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
