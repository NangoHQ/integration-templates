import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-product-category-trend-details.js';

describe('pinterest get-product-category-trend-details tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-product-category-trend-details',
        Model: 'ActionOutput_pinterest_getproductcategorytrenddetails'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
