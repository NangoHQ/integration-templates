import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-purchase-order.js';

describe('zoho-books delete-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-purchase-order',
        Model: 'ActionOutput_zoho_books_deletepurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
