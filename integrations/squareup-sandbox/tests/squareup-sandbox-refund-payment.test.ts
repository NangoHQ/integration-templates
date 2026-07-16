import { expect, it, describe } from 'vitest';

import createAction from '../actions/refund-payment.js';

describe('squareup-sandbox refund-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'refund-payment',
        Model: 'ActionOutput_squareup_sandbox_refundpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
