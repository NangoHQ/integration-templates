import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/categorize-supplier-invoice.js';

describe('pennylane categorize-supplier-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'categorize-supplier-invoice',
        Model: 'ActionOutput_pennylane_categorizesupplierinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
