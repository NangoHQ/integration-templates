import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/capture-authorized-payment.js';

describe('paypal capture-authorized-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'capture-authorized-payment',
        Model: 'ActionOutput_paypal_sandbox_captureauthorizedpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
