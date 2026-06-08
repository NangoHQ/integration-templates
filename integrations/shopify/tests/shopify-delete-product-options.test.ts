import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-product-options.js';

describe('shopify delete-product-options tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-product-options',
        Model: 'ActionOutput_shopify_deleteproductoptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
