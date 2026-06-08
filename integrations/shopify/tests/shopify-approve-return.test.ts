import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/approve-return.js';

describe('shopify approve-return tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'approve-return',
        Model: 'ActionOutput_shopify_approvereturn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
