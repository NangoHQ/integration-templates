import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-purchase-invoices.js';

describe('exact-online list-purchase-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-purchase-invoices',
        Model: 'ActionOutput_exact_online_listpurchaseinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
