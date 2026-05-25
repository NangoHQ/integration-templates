import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-product-tag.js';

describe('woocommerce get-product-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-product-tag',
        Model: 'ActionOutput_woocommerce_getproducttag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
