import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contact-products.js';

describe('zoho-bigin list-contact-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contact-products',
        Model: 'ActionOutput_zoho_bigin_listcontactproducts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
