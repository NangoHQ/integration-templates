import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-payment.js';

describe('zoho-inventory update-customer-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer-payment',
        Model: 'ActionOutput_zoho_inventory_updatecustomerpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
