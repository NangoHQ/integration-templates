import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-bank-account.js';

describe('zoho-books update-bank-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-bank-account',
        Model: 'ActionOutput_zoho_books_updatebankaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
