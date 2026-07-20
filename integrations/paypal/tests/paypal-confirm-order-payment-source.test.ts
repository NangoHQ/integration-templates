import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/confirm-order-payment-source.js';

describe('paypal confirm-order-payment-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'confirm-order-payment-source',
        Model: 'ActionOutput_paypal_sandbox_confirmorderpaymentsource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
