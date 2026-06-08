import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-market.js';

describe('shopify delete-market tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-market',
        Model: 'ActionOutput_shopify_deletemarket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
