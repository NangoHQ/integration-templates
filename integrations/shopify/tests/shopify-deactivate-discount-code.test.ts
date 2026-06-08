import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-discount-code.js';

describe('shopify deactivate-discount-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-discount-code',
        Model: 'ActionOutput_shopify_deactivatediscountcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
