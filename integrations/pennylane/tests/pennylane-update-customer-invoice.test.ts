import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-invoice.js';

describe('pennylane update-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer-invoice',
        Model: 'ActionOutput_pennylane_updatecustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
