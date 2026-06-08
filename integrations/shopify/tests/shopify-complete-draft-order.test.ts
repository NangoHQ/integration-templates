import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/complete-draft-order.js';

describe('shopify complete-draft-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'complete-draft-order',
        Model: 'ActionOutput_shopify_completedraftorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
