import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-payment-method.js';

describe('stripe get-payment-method tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-payment-method',
        Model: 'ActionOutput_stripe_getpaymentmethod'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
