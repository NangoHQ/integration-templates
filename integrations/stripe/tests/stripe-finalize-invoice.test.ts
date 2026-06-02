import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/finalize-invoice.js';

describe('stripe finalize-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'finalize-invoice',
        Model: 'ActionOutput_stripe_finalizeinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
