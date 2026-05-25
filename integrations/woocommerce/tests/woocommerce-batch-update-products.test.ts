import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-products.js';

describe('woocommerce batch-update-products tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-update-products',
        Model: 'ActionOutput_woocommerce_batchupdateproducts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
