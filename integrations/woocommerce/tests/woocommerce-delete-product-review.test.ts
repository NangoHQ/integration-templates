import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-product-review.js';

describe('woocommerce delete-product-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-product-review',
        Model: 'ActionOutput_woocommerce_deleteproductreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
