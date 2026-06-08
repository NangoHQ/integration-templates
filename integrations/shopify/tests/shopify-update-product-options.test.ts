import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-product-options.js';

describe('shopify update-product-options tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-product-options',
        Model: 'ActionOutput_shopify_updateproductoptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
