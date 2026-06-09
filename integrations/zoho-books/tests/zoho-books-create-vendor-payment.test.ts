import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-vendor-payment.js';

describe('zoho-books create-vendor-payment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-vendor-payment',
        Model: 'ActionOutput_zoho_books_createvendorpayment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
