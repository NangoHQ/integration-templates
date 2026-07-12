import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-invoice-categories.js';

describe('pennylane list-customer-invoice-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-invoice-categories',
        Model: 'ActionOutput_pennylane_listcustomerinvoicecategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
