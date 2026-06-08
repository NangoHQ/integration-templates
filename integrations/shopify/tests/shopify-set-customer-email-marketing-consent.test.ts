import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-customer-email-marketing-consent.js';

describe('shopify set-customer-email-marketing-consent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-customer-email-marketing-consent',
        Model: 'ActionOutput_shopify_setcustomeremailmarketingconsent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
