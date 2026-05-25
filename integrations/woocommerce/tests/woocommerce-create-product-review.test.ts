import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-product-review.js';

describe('woocommerce create-product-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-product-review',
        Model: 'ActionOutput_woocommerce_createproductreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
