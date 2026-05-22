import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-product-review.js';

describe('woocommerce get-product-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-product-review',
        Model: 'ActionOutput_woocommerce_getproductreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
