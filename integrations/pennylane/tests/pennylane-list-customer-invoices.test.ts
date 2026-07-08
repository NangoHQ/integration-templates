import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-invoices.js';

describe('pennylane list-customer-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-invoices',
        Model: 'ActionOutput_pennylane_listcustomerinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
