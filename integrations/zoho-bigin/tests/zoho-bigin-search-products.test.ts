import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-products.js';

describe('zoho-bigin search-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-products',
        Model: 'ActionOutput_zoho_bigin_searchproducts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
