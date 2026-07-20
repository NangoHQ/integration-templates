import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-active-subscription.js';

describe('shopify-partner get-active-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-active-subscription',
        Model: 'ActionOutput_shopify_partner_getactivesubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
