import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/accept-fulfillment-request.js';

describe('shopify accept-fulfillment-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'accept-fulfillment-request',
        Model: 'ActionOutput_shopify_acceptfulfillmentrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
