import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/match-transaction-to-customer-invoice.js';

describe('pennylane match-transaction-to-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'match-transaction-to-customer-invoice',
        Model: 'ActionOutput_pennylane_matchtransactiontocustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
