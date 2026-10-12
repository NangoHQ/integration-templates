import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/confirm-sales-order.js';

describe('zoho-inventory confirm-sales-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'confirm-sales-order',
        Model: 'ActionOutput_zoho_inventory_confirmsalesorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
