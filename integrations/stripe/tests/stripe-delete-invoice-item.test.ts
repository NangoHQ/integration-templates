import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-invoice-item.js';

describe('stripe delete-invoice-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-invoice-item',
        Model: 'ActionOutput_stripe_deleteinvoiceitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
