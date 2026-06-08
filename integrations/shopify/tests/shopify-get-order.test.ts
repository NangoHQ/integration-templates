import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order.js';

describe('shopify get-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-order',
        Model: 'ActionOutput_shopify_getorder'
    });

    it('should throw an error when the order is not found', async () => {
        const input = await nangoMock.getInput();

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow();
    });
});
