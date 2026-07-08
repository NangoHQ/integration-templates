import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unmatch-transaction-from-supplier-invoice.js';

describe('pennylane unmatch-transaction-from-supplier-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unmatch-transaction-from-supplier-invoice',
        Model: 'ActionOutput_pennylane_unmatchtransactionfromsupplierinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
