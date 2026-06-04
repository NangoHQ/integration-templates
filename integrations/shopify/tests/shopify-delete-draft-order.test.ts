import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-draft-order.js';

describe('shopify delete-draft-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-draft-order',
        Model: 'ActionOutput_shopify_deletedraftorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
