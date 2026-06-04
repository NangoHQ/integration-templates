import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-inventory-item.js';

describe('shopify update-inventory-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-inventory-item',
        Model: 'ActionOutput_shopify_updateinventoryitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
