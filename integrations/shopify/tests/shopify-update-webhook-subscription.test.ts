import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-webhook-subscription.js';

describe('shopify update-webhook-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-webhook-subscription',
        Model: 'ActionOutput_shopify_updatewebhooksubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
