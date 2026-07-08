import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-customer-invoice-from-quote.js';

describe('pennylane create-customer-invoice-from-quote tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-customer-invoice-from-quote',
        Model: 'ActionOutput_pennylane_createcustomerinvoicefromquote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
