import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/void-sales-order.js';

describe('zoho-inventory void-sales-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'void-sales-order',
        Model: 'ActionOutput_zoho_inventory_voidsalesorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
