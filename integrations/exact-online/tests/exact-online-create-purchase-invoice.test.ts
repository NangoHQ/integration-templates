import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-purchase-invoice.js';

describe('exact-online create-purchase-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-purchase-invoice',
        Model: 'ActionOutput_exact_online_createpurchaseinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
