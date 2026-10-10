import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-recurring-invoices.js';

describe('zoho-invoice list-recurring-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-recurring-invoices',
        Model: 'ActionOutput_zoho_invoice_listrecurringinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
