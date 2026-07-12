import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer-invoice.js';

describe('pennylane get-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-customer-invoice',
        Model: 'ActionOutput_pennylane_getcustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
