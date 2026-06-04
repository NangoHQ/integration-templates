import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-automatic-discount-free-shipping.js';

describe('shopify update-automatic-discount-free-shipping tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-automatic-discount-free-shipping',
        Model: 'ActionOutput_shopify_updateautomaticdiscountfreeshipping'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
