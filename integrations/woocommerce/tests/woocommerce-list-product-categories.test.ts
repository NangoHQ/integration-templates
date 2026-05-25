import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-product-categories.js';

describe('woocommerce list-product-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-product-categories',
        Model: 'ActionOutput_woocommerce_listproductcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
