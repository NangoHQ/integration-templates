import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-payments.js';

describe('zoho-books list-payments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-payments',
        Model: 'ActionOutput_zoho_books_listpayments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
