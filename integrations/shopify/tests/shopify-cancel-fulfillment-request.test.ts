import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-fulfillment-request.js';

describe('shopify cancel-fulfillment-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-fulfillment-request',
        Model: 'ActionOutput_shopify_cancelfulfillmentrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
