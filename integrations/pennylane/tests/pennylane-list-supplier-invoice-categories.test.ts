import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supplier-invoice-categories.js';

describe('pennylane list-supplier-invoice-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supplier-invoice-categories',
        Model: 'ActionOutput_pennylane_listsupplierinvoicecategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
