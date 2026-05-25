import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-product-category.js';

describe('woocommerce delete-product-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-product-category',
        Model: 'ActionOutput_woocommerce_deleteproductcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
