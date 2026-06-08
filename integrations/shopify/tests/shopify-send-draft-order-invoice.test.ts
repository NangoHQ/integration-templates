import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-draft-order-invoice.js';

describe('shopify send-draft-order-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-draft-order-invoice',
        Model: 'ActionOutput_shopify_senddraftorderinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
