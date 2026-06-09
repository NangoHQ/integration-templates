import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-purchase-orders.js';

describe('zoho-books list-purchase-orders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-purchase-orders',
        Model: 'ActionOutput_zoho_books_listpurchaseorders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
