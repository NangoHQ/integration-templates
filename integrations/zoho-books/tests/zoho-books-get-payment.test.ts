import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-payment.js';

describe('zoho-books get-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-payment',
        Model: 'ActionOutput_zoho_books_getpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
