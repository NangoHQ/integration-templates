import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-customer-payment.js';

describe('zoho-invoice delete-customer-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-customer-payment',
        Model: 'ActionOutput_zoho_invoice_deletecustomerpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
