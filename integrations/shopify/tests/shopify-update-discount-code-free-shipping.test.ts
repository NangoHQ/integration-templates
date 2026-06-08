import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-discount-code-free-shipping.js';

describe('shopify update-discount-code-free-shipping tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-discount-code-free-shipping',
        Model: 'ActionOutput_shopify_updatediscountcodefreeshipping'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
