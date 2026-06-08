import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-product-media.js';

describe('shopify create-product-media tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-product-media',
        Model: 'ActionOutput_shopify_createproductmedia'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
