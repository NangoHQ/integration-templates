import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer-payment.js';

describe('zoho-invoice get-customer-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-customer-payment',
        Model: 'ActionOutput_zoho_invoice_getcustomerpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
