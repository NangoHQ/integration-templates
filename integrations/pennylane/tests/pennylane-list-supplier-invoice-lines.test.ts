import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supplier-invoice-lines.js';

describe('pennylane list-supplier-invoice-lines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supplier-invoice-lines',
        Model: 'ActionOutput_pennylane_listsupplierinvoicelines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
