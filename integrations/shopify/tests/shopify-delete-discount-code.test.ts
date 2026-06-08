import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-discount-code.js';

describe('shopify delete-discount-code tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-discount-code',
        Model: 'ActionOutput_shopify_deletediscountcode'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
