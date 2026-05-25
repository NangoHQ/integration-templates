import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-product-variation.js';

describe('woocommerce create-product-variation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-product-variation',
        Model: 'ActionOutput_woocommerce_createproductvariation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
