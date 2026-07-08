import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-customer-invoice-by-email.js';

describe('pennylane send-customer-invoice-by-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-customer-invoice-by-email',
        Model: 'ActionOutput_pennylane_sendcustomerinvoicebyemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
