import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/record-payment-against-open-invoices.js';

describe('zoho-inventory record-payment-against-open-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'record-payment-against-open-invoices',
        Model: 'ActionOutput_zoho_inventory_recordpaymentagainstopeninvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
