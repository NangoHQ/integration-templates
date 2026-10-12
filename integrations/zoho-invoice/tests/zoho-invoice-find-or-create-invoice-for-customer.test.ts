import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-invoice-for-customer.js';

describe('zoho-invoice find-or-create-invoice-for-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-invoice-for-customer',
        Model: 'ActionOutput_zoho_invoice_findorcreateinvoiceforcustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
