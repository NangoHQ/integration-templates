import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-invoice-items.js';

describe('stripe list-invoice-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-invoice-items',
        Model: 'ActionOutput_stripe_listinvoiceitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
