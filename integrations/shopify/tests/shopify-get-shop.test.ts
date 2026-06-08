import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-shop.js';

describe('shopify get-shop tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-shop',
        Model: 'ActionOutput_shopify_getshop'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
