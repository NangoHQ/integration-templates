import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/hold-fulfillment-order.js';

describe('shopify hold-fulfillment-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'hold-fulfillment-order',
        Model: 'ActionOutput_shopify_holdfulfillmentorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
