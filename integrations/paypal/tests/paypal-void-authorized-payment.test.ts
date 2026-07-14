import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/void-authorized-payment.js';

describe('paypal void-authorized-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'void-authorized-payment',
        Model: 'ActionOutput_paypal_sandbox_voidauthorizedpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
