import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/close-return.js';

describe('shopify close-return tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'close-return',
        Model: 'ActionOutput_shopify_closereturn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
