import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-invoice-lines.js';

describe('pennylane list-customer-invoice-lines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-invoice-lines',
        Model: 'ActionOutput_pennylane_listcustomerinvoicelines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
