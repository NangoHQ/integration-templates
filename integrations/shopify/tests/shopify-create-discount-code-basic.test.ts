import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-discount-code-basic.js';

describe('shopify create-discount-code-basic tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-discount-code-basic',
        Model: 'ActionOutput_shopify_creatediscountcodebasic'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
