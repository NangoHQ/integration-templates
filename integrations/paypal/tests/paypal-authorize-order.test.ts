import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/authorize-order.js';

describe('paypal authorize-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'authorize-order',
        Model: 'ActionOutput_paypal_sandbox_authorizeorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
