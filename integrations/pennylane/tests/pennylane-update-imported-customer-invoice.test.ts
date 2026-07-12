import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-imported-customer-invoice.js';

describe('pennylane update-imported-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-imported-customer-invoice',
        Model: 'ActionOutput_pennylane_updateimportedcustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
