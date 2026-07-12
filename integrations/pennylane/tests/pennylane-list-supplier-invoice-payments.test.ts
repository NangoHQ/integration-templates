import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supplier-invoice-payments.js';

describe('pennylane list-supplier-invoice-payments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supplier-invoice-payments',
        Model: 'ActionOutput_pennylane_listsupplierinvoicepayments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
