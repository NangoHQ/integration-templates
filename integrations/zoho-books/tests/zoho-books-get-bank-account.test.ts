import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-bank-account.js';

describe('zoho-books get-bank-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-bank-account',
        Model: 'ActionOutput_zoho_books_getbankaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
