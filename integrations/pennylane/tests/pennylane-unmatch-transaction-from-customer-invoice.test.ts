import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unmatch-transaction-from-customer-invoice.js';

describe('pennylane unmatch-transaction-from-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unmatch-transaction-from-customer-invoice',
        Model: 'ActionOutput_pennylane_unmatchtransactionfromcustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
