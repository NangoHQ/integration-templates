import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-customer-invoice-paid.js';

describe('pennylane mark-customer-invoice-paid tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-customer-invoice-paid',
        Model: 'ActionOutput_pennylane_markcustomerinvoicepaid'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
