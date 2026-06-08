import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-webhook-subscription.js';

describe('shopify create-webhook-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-webhook-subscription',
        Model: 'ActionOutput_shopify_createwebhooksubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
