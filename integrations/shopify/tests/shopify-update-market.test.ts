import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-market.js';

describe('shopify update-market tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-market',
        Model: 'ActionOutput_shopify_updatemarket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
