import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-gift-card.js';

describe('shopify update-gift-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-gift-card',
        Model: 'ActionOutput_shopify_updategiftcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
