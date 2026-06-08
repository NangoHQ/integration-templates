import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/adjust-inventory-quantities.js';

describe('shopify adjust-inventory-quantities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'adjust-inventory-quantities',
        Model: 'ActionOutput_shopify_adjustinventoryquantities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
