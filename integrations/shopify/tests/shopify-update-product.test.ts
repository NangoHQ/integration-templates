import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-product.js';

describe('shopify update-product tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-product',
        Model: 'ActionOutput_shopify_updateproduct'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
