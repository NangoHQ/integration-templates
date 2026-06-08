import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-inventory-quantities.js';

describe('shopify set-inventory-quantities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-inventory-quantities',
        Model: 'ActionOutput_shopify_setinventoryquantities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
