import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reject-fulfillment-request.js';

describe('shopify reject-fulfillment-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reject-fulfillment-request',
        Model: 'ActionOutput_shopify_rejectfulfillmentrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
