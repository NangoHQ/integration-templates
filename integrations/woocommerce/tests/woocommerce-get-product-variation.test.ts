import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-product-variation.js';

describe('woocommerce get-product-variation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-product-variation',
        Model: 'ActionOutput_woocommerce_getproductvariation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
