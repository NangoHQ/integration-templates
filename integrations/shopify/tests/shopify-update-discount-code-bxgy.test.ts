import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-discount-code-bxgy.js';

describe('shopify update-discount-code-bxgy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-discount-code-bxgy',
        Model: 'ActionOutput_shopify_updatediscountcodebxgy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
