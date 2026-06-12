import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vendor-payments.js';

describe('zoho-books list-vendor-payments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vendor-payments',
        Model: 'ActionOutput_zoho_books_listvendorpayments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
