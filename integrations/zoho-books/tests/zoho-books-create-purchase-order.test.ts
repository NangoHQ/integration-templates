import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-purchase-order.js';

describe('zoho-books create-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-purchase-order',
        Model: 'ActionOutput_zoho_books_createpurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
