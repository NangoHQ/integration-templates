import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-product.js';

describe('stripe get-product tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-product',
        Model: 'ActionOutput_stripe_getproduct'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
