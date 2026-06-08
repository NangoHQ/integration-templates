import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-discount-code-free-shipping.js';

describe('shopify create-discount-code-free-shipping tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-discount-code-free-shipping',
        Model: 'ActionOutput_shopify_creatediscountcodefreeshipping'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
