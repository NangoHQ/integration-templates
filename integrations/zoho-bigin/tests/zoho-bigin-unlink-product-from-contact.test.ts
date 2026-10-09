import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unlink-product-from-contact.js';

describe('zoho-bigin unlink-product-from-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unlink-product-from-contact',
        Model: 'ActionOutput_zoho_bigin_unlinkproductfromcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
