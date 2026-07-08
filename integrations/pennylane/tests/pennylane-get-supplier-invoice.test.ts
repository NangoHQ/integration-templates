import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-supplier-invoice.js';

describe('pennylane get-supplier-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-supplier-invoice',
        Model: 'ActionOutput_pennylane_getsupplierinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
