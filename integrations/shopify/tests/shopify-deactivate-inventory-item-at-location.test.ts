import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-inventory-item-at-location.js';

describe('shopify deactivate-inventory-item-at-location tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-inventory-item-at-location',
        Model: 'ActionOutput_shopify_deactivateinventoryitematlocation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
