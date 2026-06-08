import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-return.js';

describe('shopify get-return tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-return',
        Model: 'ActionOutput_shopify_getreturn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
