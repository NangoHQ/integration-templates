import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-invoice.js';

describe('stripe delete-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-invoice',
        Model: 'ActionOutput_stripe_deleteinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
