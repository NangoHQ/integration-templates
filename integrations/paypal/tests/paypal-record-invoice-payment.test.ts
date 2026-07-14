import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/record-invoice-payment.js';

describe('paypal record-invoice-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'record-invoice-payment',
        Model: 'ActionOutput_paypal_sandbox_recordinvoicepayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
