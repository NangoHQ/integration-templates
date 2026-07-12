import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/validate-supplier-invoice-accounting.js';

describe('pennylane validate-supplier-invoice-accounting tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'validate-supplier-invoice-accounting',
        Model: 'ActionOutput_pennylane_validatesupplierinvoiceaccounting'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
