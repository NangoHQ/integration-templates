import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-payment-methods.js';

describe('stripe list-payment-methods tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-payment-methods',
        Model: 'ActionOutput_stripe_listpaymentmethods'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
