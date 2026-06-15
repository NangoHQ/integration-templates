import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-purchase-order.js';

describe('zoho-books update-purchase-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-purchase-order',
        Model: 'ActionOutput_zoho_books_updatepurchaseorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
