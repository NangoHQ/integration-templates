import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/record-payment-and-apply-to-invoices.js';

describe('zoho-invoice record-payment-and-apply-to-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'record-payment-and-apply-to-invoices',
        Model: 'ActionOutput_zoho_invoice_recordpaymentandapplytoinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
