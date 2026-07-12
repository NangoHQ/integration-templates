import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supplier-invoices.js';

describe('pennylane list-supplier-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supplier-invoices',
        Model: 'ActionOutput_pennylane_listsupplierinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
