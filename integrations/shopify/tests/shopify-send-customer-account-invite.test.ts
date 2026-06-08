import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-customer-account-invite.js';

describe('shopify send-customer-account-invite tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-customer-account-invite',
        Model: 'ActionOutput_shopify_sendcustomeraccountinvite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
