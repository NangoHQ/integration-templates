import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-payment-intent.js';

describe('stripe create-payment-intent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-payment-intent',
        Model: 'ActionOutput_stripe_createpaymentintent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
