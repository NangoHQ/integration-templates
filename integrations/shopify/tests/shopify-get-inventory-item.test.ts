import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-inventory-item.js';

describe('shopify get-inventory-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-inventory-item',
        Model: 'ActionOutput_shopify_getinventoryitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
