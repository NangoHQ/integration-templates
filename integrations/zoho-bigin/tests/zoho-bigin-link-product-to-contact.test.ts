import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/link-product-to-contact.js';

describe('zoho-bigin link-product-to-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-product-to-contact',
        Model: 'ActionOutput_zoho_bigin_linkproducttocontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
