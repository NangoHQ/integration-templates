import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-invoice.js';

describe('paypal get-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-invoice',
        Model: 'ActionOutput_paypal_sandbox_getinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
